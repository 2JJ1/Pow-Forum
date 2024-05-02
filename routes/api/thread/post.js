const router = require('express').Router()
var escape = require('escape-html')
const phraseblacklist = require('phrase-blacklist')
const jsdom = require("jsdom")
const stripCombiningMarks = require('strip-combining-marks')
const mongoose = require("mongoose")

const forumapi = require('../../../my_modules/forumapi')
const pfAPI = require('../../../my_modules/pfapi')
const recaptcha = require('../../../my_modules/captcha')
const rolesAPI = require('../../../my_modules/rolesapi')
const notificationsAPI = require('../../../my_modules/notifications')
const accountAPI = require('../../../my_modules/accountapi')
const { ThreadSanitizeHTML } = require('../../../my_modules/other')

const ForumSettings = mongoose.model("ForumSettings") 
const ThreadReplies = mongoose.model("ThreadReplies") 
const Threads = mongoose.model("Threads") 
const Accounts = mongoose.model("Accounts") 

const { JSDOM } = jsdom;

// /api/thread

// Post to forum
router.post('/', async (req, res, next) => {
	try {
		let response = {success: false}

		//Prevent bots/spam with Google captcha
		if(!await recaptcha.captcha(req.body.grecaptcharesponse, (req.headers['x-forwarded-for'] || req.connection.remoteAddress))) 
			throw "Captcha failed"
		
		//Only allow logged in users to view profiles
		if(!req.session.uid) throw "You must be logged in to post"

		let subcategory = req.body.forum
		if(typeof subcategory !== "number") throw "Invalid subcategory"

		let topic = req.body.topic
		if(!topic) throw "Missing topic"
		if(typeof topic !== "string") throw "Invalid topic"
		topic = pfAPI.validateTopic(topic)

		let content = req.body.content
		if(!content) throw "Missing content"
		if(typeof content !== "string") throw "Invalid content"
		if(content.length > 20000) throw "Content contains too much HTML data"

		//Check if the user's email is verified.
		if(!await accountAPI.emailVerified(req.session.uid)) throw "Please verify your email first!"

		//Get category
		let category = await forumapi.GetSubcategory(subcategory)

        //Check if the forum exists
		if(!category) throw "Invalid category"
		
		let account = await accountAPI.fetchAccount(req.session.uid, {reputation: true})

		//Check if client has permission to post in this category
		if(!await forumapi.permissionsCheck(category.requiredRoles, account.roles)) throw 'No permission to post here'

		//Reputation must be greater than -10
		if(account.reputation <= -10) throw "Your reputation is too low"
			
		let currentDate = new Date();
		let safeContent = ThreadSanitizeHTML(content)

		//Extract text content (Filter out HTML tags)
		let dom = new JSDOM(safeContent)

		//Handle links
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

		//Patrons, VIPs, and users with 10+ rep get an increased character limit
		var characterLimit = await rolesAPI.isSupporter(account.roles) || account.reputation > 10 ? 15000 : 8000;

		//Set character count bounds
		if((textContent.match(/\w/g)||"").length < 20 || textContent.length > characterLimit) throw `Content must be 20-${characterLimit} characters long`

		//Check if the content is family safe
		let isClean2 = phraseblacklist.isClean(textContent.toLowerCase())
		if(typeof isClean2 === "string") throw `Content contains blacklisted phrase: ${isClean2}`

		//Make sure this isn't a duplicate thread
		var dupContent = await ThreadReplies.findOne({content: safeContent})
		if(dupContent) throw "A thread already exists with this exact content."

		//Users can only post one thread every 30 minutes
		//Find the latest thread by them
		var latestThreads = await Threads.find({uid: req.session.uid}).sort({_id: -1}).limit(3)
		if(latestThreads.length > 0){
			//People with a rep of 5+ can post 3 times per 30 minutes
			if(account.reputation >= 5){
				if(latestThreads.length >= 3){
					//Find their original reply on their 3rd youngest thread
					let firstReply = await ThreadReplies.findOne({tid: latestThreads[2]._id}).sort({_id: 1})
					//Checks if the thread is too old
					if(firstReply && currentDate < new Date(firstReply.date).getTime() + 1000*60*30) throw "You can only post 3 threads per 30 minutes."
				}
			}
			//People with less than 5 rep can only post once per 30 minutes
			else{
				//Find the first reply on their latest thread
				let firstReply = await ThreadReplies.findOne({tid: latestThreads[0]._id}).sort({_id: 1})
				//Checks if the thread is too old
				if(currentDate < new Date(firstReply.date).getTime() + 1000*60*30) throw "You can only post 1 thread per 30 minutes."
			}
		}

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
			
		//Creates the thread
		let newThread = await new Threads({
			category: req.body.forum,
			title: topic,
			uid: req.session.uid,
		}).save()

		//Creates original reply
		let replyData = {
			uid: req.session.uid,
			tid: newThread._id,
			category: req.body.forum,
			date: currentDate,
			content: safeContent,
		}
		if(!verified) replyData.verified = false
		await new ThreadReplies(replyData).save()

		//No errors at this point? Successful thread creation
		response.success = true
		response.tid = newThread._id
		res.json(response)

		//Adds the convo starter role if they have over 50 threads
		var threadCount = await Threads.countDocuments({uid: req.session.uid})
		if(threadCount > 50){
			if(!await rolesAPI.RolesHasRole(account.roles, "convo starter")){
				account.roles.push("convo starter")
				await Accounts.updateOne({_id: req.session.uid}, {roles: JSON.stringify(account.roles)})
				await notificationsAPI.SendNotification({
					//webpushsub: req.session.webpushsub,
					recipientid: req.session.uid,
					type: "newbadge",
					badgeName: "Convo Starter"
				})
			}
		}
	}
	catch(e){
		next(e)
	}
})

module.exports = router;