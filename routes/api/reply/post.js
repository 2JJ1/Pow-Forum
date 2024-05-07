const router = require('express').Router()
const phraseblacklist = require('phrase-blacklist')
const mongoose = require("mongoose")
const jsdom = require("jsdom")

const recaptcha = require('../../../my_modules/captcha')
const rolesAPI = require('../../../my_modules/rolesapi')
const accountAPI = require('../../../my_modules/accountapi')
const notificationsAPI = require('../../../my_modules/notifications')
const forumAPI = require('../../../my_modules/forumapi')
const { GetMentionedUIDs } = require('../../../my_modules/pfapi')
const { ThreadSanitizeHTML } = require('../../../my_modules/other')

const { JSDOM } = jsdom;
const Notifications = mongoose.model("Notifications")
const ForumSettings = mongoose.model("ForumSettings")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const Accounts = mongoose.model("Accounts")

// /api/reply

// Post a reply to forum thread
router.post('/', async (req, res, next) => {
	try{
		let response = {success: false}

		//Prevent bots/spam with Google captcha
		if(!await recaptcha.captcha(req.body['g-recaptcha-response'], (req.headers['x-forwarded-for'] || req.connection.remoteAddress))) 
			throw 'Captcha failed'
		
		// Check if all necessary post fields exist
		//Only allow logged in users to view profiles
		if(!req.session.uid) throw 'You must be logged in'

		//If this is a comment reply, trid is specified
		let {trid} = req.body
		//What thread this reply is for
		let tid 
		//What reply this comment is for(If is a comment)
		let commentingTo
		if(trid) {
			trid = parseInt(trid)
			if(!Number.isInteger(trid)) throw "Invalid thread reply id"
			commentingTo = await ThreadReplies.findById(trid).lean()
			if(!commentingTo) throw "This reply does not exist"
			if("trid" in commentingTo) throw "You can not reply to comments"
			tid = commentingTo.tid
		}
		else tid = parseInt(req.body.tid)
		if(!tid) throw "Thread id not specified"
		if(!Number.isInteger(tid)) throw "Invalid thread id"

		let content = req.body.content
		if(!content) throw "Missing content"
		if(typeof content !== "string") throw "Invalid text content"

		//Retrieves forum from the thread this reply is attached to.
		//Also used to 'hackily' determine if the thread exists
		let thread = await Threads.findById(tid)
		if(!thread) throw "Thread does not exist"

		if(thread.locked) throw "Can not reply to locked threads"

		//Check if the user's email is verified.
		if(!await accountAPI.emailVerified(req.session.uid)) throw "Please verify your email first!"

		//Fetch the client's account
		let account = await accountAPI.fetchAccount(req.session.uid, {reputation: true})

		//Does this category require a specific role?
		let category = await forumAPI.GetSubcategory(thread.category)
		if(!forumAPI.permissionsCheck(category.requiredRoles, account.roles)) throw "You lack permissions to post here"

		// Reputation must be greater than -20
		if(account.reputation<=-20) throw "Your reputation is too low"

		//Only grab whitelisted HTML
		let safeContent = ThreadSanitizeHTML(content)

		//Extract text content (Filter out HTML tags)
		let dom = new JSDOM(safeContent)

		//Adds nofollow to unwhitelisted links. Hopefully will discourage advertisement bots.
		let allowedFollowDomains = (await ForumSettings.findOne({type: "allowedFollowDomains"}) ?? {value: []}).value
		let untrustedAnchorTagFound = false
		Array.from(dom.window.document.getElementsByTagName("a")).forEach(a => {
			//Adds nofollow to unwhitelisted links. Hopefully will discourage advertisement bots
			let href = a.getAttribute("href")
			let hostname
			try {
				hostname = new URL(href).hostname
			} catch(e){}
			//No hostname? Probably a / route to redirect on the same site
			//Adds nofollow
			if(hostname && allowedFollowDomains.indexOf(hostname) === -1) {
				a.setAttribute("rel", "noreferrer nofollow")
				untrustedAnchorTagFound = true
			}
			//Ensures links open in a new tab 
			a.setAttribute("target", "_blank")
		})
		safeContent = dom.serialize()

		let textContent = dom.window.document.body.textContent

		//Character count check
		if((textContent.match(/\w/g)||"").length < 10 || textContent.length > 5000) throw 'Content length must be 10-5000 chars'

		//Check if the content is family safe
		let isClean = phraseblacklist.isClean(textContent.toLowerCase())
		if(typeof isClean === "string") throw `Content contains blacklisted phrase: ${isClean}`

		let currentDate = new Date();

		//Can't reply to 1 month old threads (Prevent necro posting)
		//Grab original reply and check date
		await ThreadReplies.findOne({tid}).sort({_id: 1})
		.then(op => {
			//Would only occur if there is a server design issue
			if(!op) throw "This thread has no replies"

			//Add 30 days to the thread start date to determine reply expiration
			var replyExpires = new Date(op.date)
			replyExpires.setDate(replyExpires.getDate() + 90)
			if(currentDate > replyExpires) throw "This thread is too old to reply to"
		})

		//Grab mentions from reply
		let mentionedUIDs = await GetMentionedUIDs(textContent)
		if(mentionedUIDs.length > 3) throw "You may only mention up to three users."

		//Limit common member replies to one per 15 seconds
		let lastEverReply = await ThreadReplies.findOne({uid: req.session.uid}).sort({_id: -1})
		if(!await rolesAPI.isModerator(account.roles) && lastEverReply && (new Date() < new Date(lastEverReply.date).getTime()+15000)) throw "Please wait longer between replies"
		
		// Automod- Determine if reply requires verification
		let verified = true
		//Accounts with negative reputation are untrusted
		if(account.reputation < 0) verified = false
		//Accounts younger than 24 hours are untrusted
		else if(account.creationdate > Date.now() - 1000*60*60*24) verified = false
		//Accounts with low reputation need verification for links
		else if(account.reputation <=2){
			//Checks if there is an untrusted clickable link
			if(untrustedAnchorTagFound) verified = false
			//Check if text content contains a possible link
			else if(/(https?:\/\/)?.+\.(com|net)/i.test(textContent.toLowerCase())) verified = false
		}

		//Finally registers the reply in the database
		let replyData = {
			uid: req.session.uid,
			tid,
			category: thread.category,
			date: currentDate,
			content: safeContent,
		}
		//Only set if not verified
		if(!verified) replyData.verified = false
		//Marks this reply as a comment for said thread reply id
		if(trid) replyData.trid = trid
		const newReply = await new ThreadReplies(replyData)
		.save()

		//Sends notification to the OP stating someone else has replied to their thread
		if(
			//Don't notify self
			(thread.uid != req.session.uid) && 
			//Avoid repeat notifications
			!(await Notifications.findOne({$or: [{type: "threadreply"}, {type: "threadcomment"}], tid, recipientid: thread.uid, senderid: req.session.uid}))
		){ 
			await notificationsAPI.SendNotification({
				webpushsub: req.session.webpushsub, 
				type: !trid ? "threadreply" : "threadcomment",
				recipientid: thread.uid,
				senderid: req.session.uid,
				tid: tid,
				trid: newReply._id,
			})
		}

		//Notify of comments to original replier
		if(
			trid && 
			//Don't send repeat notification to OP
			thread.uid != commentingTo.uid &&
			//Don't notify self
			commentingTo.uid != req.session.uid &&
			//Avoid repeat notifications
			!(await Notifications.findOne({type: "threadreplycomment", tid, recipientid: thread.uid, senderid: req.session.uid}))
		){
			await notificationsAPI.SendNotification({
				webpushsub: req.session.webpushsub, 
				type: "threadreplycomment",
				recipientid: commentingTo.uid,
				senderid: req.session.uid,
				tid,
				trid: newReply._id,
			})
		}

		//Sends notifications to all mentioned members stating they were mentioned
		for(var i=0; i<mentionedUIDs.length; i++){
			//Don't send notification to OP because they already get a "new reply" notif
			//Don't send notification to self
			if ((mentionedUIDs[i] != thread.uid) && (mentionedUIDs[i] != req.session.uid)) {
				await notificationsAPI.SendNotification({
					webpushsub: req.session.webpushsub,
					type: "threadreplymention",
					recipientid: mentionedUIDs[i],
					senderid: req.session.uid,
					tid: tid,
					trid: newReply._id
				})
			}
		}

		// NOTE: REAPPLY THIS TO THE VERIFICATION PROCESS
		if(verified){
			//Adds the active forumer role if they have over 150 replies (Excluding OPs)
			var threadCount = await Threads.countDocuments({uid: req.session.uid})
			var replyCount = await ThreadReplies.countDocuments({uid: req.session.uid}) - threadCount
			if(replyCount > 150){
				if(!await rolesAPI.RolesHasRole(account.roles, "active forumer")){
					account.roles.push("active forumer")
					await Accounts.updateOne({_id: req.session.uid}, {roles: JSON.stringify(account.roles)})

					await notificationsAPI.SendNotification({
						//webpushsub: req.session.webpushsub,
						recipientid: req.session.uid,
						type: "newbadge",
						badgeName: "Active Forumer"
					})
				}
			}
		} 
			
		//Code hasn't exited, so assume success
		response.replyId = newReply._id
		if(!verified) response.verificationRequired = true
		response.success = true
		res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router;