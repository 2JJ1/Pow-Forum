const express = require('express');
const router = express.Router();
const phraseblacklist = require('phrase-blacklist');
const mongoose = require("mongoose")
const jsdom = require("jsdom")

const stripCombiningMarks = require('strip-combining-marks');
const recaptcha = require('../../my_modules/captcha');
const rolesAPI = require('../../my_modules/rolesapi');
const accountAPI = require('../../my_modules/accountapi');
const notificationsAPI = require('../../my_modules/notifications')
const forumAPI = require('../../my_modules/forumapi')
const { GetMentionedUIDs } = require('../../my_modules/pfapi')
const { ThreadSanitizeHTML } = require('../../my_modules/other')

const { JSDOM } = jsdom;
const Notifications = mongoose.model("Notifications")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const ForumSettings = mongoose.model("ForumSettings")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const Accounts = mongoose.model("Accounts")
const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")
const PinnedThreads = mongoose.model("PinnedThreads")

// /api/thread/reply

// Post a reply to forum thread
router.post('/', async (req, res) => {
	let response = {success: false}
	
	try{
		//Prevent bots/spam with Google captcha
		if(!await recaptcha.captchaV2(req.body['g-recaptcha-response'], (req.headers['x-forwarded-for'] || req.connection.remoteAddress))) 
			throw 'Captcha failed'
		
		// Check if all necessary post fields exist
		//Only allow logged in users to view profiles
		if(!req.session.uid) throw 'You must be logged in'

		let tid = parseInt(req.body.tid)
		if(!tid) throw "Thread ID not specified"
		if(!Number.isInteger(tid)) throw "Invalid thread reply id"

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
		let account = await accountAPI.fetchAccount(req.session.uid)

		//Does this category require a specific role?
		let category = await forumAPI.GetSubcategory(thread.category)
		if(!forumAPI.permissionsCheck(category.requiredRoles, account.roles)) throw "You lack permissions to post here"

		// Reputation must be greater than -20
		//Sum of reputation
		var reputation = await accountAPI.SumReputation(req.session.uid)
		if(reputation<=-20) throw "Your reputation is too low"

		//Only grab whitelisted HTML
		let safeContent = stripCombiningMarks(ThreadSanitizeHTML(content))

		//Extract text content (Filter out HTML tags)
		let dom = new JSDOM(safeContent)

		//Adds nofollow to unwhitelisted links. Hopefully will discourage advertisement bots.
		let allowedFollowDomains = (await ForumSettings.findOne({type: "allowedFollowDomains"}) ?? {value: []}).value
		Array.from(dom.window.document.getElementsByTagName("a")).forEach(a => {
			let href = a.getAttribute("href")
			let hostname
			try {
				hostname = new URL(href).hostname
			} catch(e){}
			//No hostname? Probably a / route to redirect on the same site
			if(!hostname) return
			//Adds nofollow
			if(allowedFollowDomains.indexOf(hostname) === -1) a.setAttribute("rel", "noreferrer nofollow")
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
		
		//Finally registers the reply in the database
		const newReply = await new ThreadReplies({
			uid: req.session.uid,
			tid,
			category: thread.category,
			date: currentDate,
			content: safeContent,
		}).save()

		//Sends notification to the OP stating someone else has replied to their thread
		if(
			//Don't notify self
			(thread.uid != req.session.uid) && 
			//Avoid repeat notifications
			!(await Notifications.findOne({type: "threadreply", tid, recipientid: thread.uid, senderid: req.session.uid}))
		){ 
			await notificationsAPI.SendNotification({
				webpushsub: req.session.webpushsub, 
				type: "threadreply",
				recipientid: thread.uid,
				senderid: req.session.uid,
				tid: tid,
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
			
		//Code hasn't exited, so assume success
		response.success = true
	} catch(e){
		response.reason = "Server error"
		if(e.safe && e.safe.length > 0) response.reason = e.safe;
		else if (typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
});

//Delete reply
router.delete('/', async (req, res) => {
	let response = {success: false}
	
	try{
		//Check if logged in
		if(!req.session.uid) throw "Not logged in"
		
		let targetReplyID = parseInt(req.body.trid)
		if(!targetReplyID) throw "Thread reply ID not specified"
		if(!Number.isInteger(targetReplyID)) throw "Invalid thread reply id"
		
		//Get target reply
		let targetReply = await ThreadReplies.findById(targetReplyID)
		if(!targetReply) throw "Thread reply not found"
		
		//Check if client has permission to delete requested replier
		if(!await rolesAPI.isClientOverpowerTarget(req.session.uid, targetReply.uid)) throw "No permission"
		
		//Get original post
		let OP = await ThreadReplies.findOne({tid: targetReply.tid}).sort({_id: 1})
		if(!OP) throw "Could not find the original post" //Should be impossible to ever throw but... Who knows?

		//Check if original post's trid matches the target reply's trid
		let isOP = OP._id == targetReply._id

		//Is the reply the original post
		if(isOP){
			//Without the original post, there is no context for the following replies, so,
			//Delete the entire thread(thread and it's replies)
			await Threads.deleteOne({_id: targetReply.tid})
			await ThreadReplies.find({tid: targetReply.tid})
			.then(async replies => {
				for(let reply of replies){
					await ThreadReplyReacts.deleteMany({trid: reply._id})
					await reply.remove()
				}
			})
			//Delete notifications pertaining to this thread to prevent ghost notifications
			await Notifications.deleteMany({tid: targetReply.tid})
			await PinnedThreads.deleteOne({_id: targetReply.tid})
			response.deletedThread = true
		}
		//Post is a regular reply
		else{
			//Only delete the specifically requested thread reply
			await ThreadReplies.deleteOne({_id: targetReply._id})
			//Delete data associated with reply
			await ThreadReplyReacts.deleteMany({trid: targetReply._id})
			//Delete notifications pertaining to this reply to prevent ghost notifications
			await Notifications.deleteMany({trid: targetReplyID})
		}

		//Log audit
		var log = new ForumAuditLogs({
			time: Date.now(),
			type: isOP ? "delete-thread" : "delete-reply",
			tid: targetReply.tid, //What thread was affected
			targetUID: targetReply.uid, //Who owned the reply
			byUID: req.session.uid, //Who deleted the reply
		})
		await log.save()
		
		//No exception was thrown, so must've been successful
		response.success = true
	}
	catch(e){
		response.reason = "Server error"
		if(typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;