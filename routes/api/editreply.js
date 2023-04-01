const express = require('express');
const router = express.Router();
const phraseblacklist = require('phrase-blacklist');
const mongoose = require("mongoose")
const jsdiff = require("diff")
const jsdom = require("jsdom");

const stripCombiningMarks = require('strip-combining-marks');
const recaptcha = require('../../my_modules/captcha');
const rolesAPI = require('../../my_modules/rolesapi');
const accountAPI = require('../../my_modules/accountapi')
const { ThreadSanitizeHTML } = require('../../my_modules/other')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const ForumSettings = mongoose.model("ForumSettings")
const ThreadReplies = mongoose.model("ThreadReplies") 

const { JSDOM } = jsdom;
 
// 	/api/r

// Post to client's wall
router.post('/edit', async (req, res) => {
	let response = {success: false}
	
	try{
		//Prevent bots/spam with Google captcha
		if(!await recaptcha.captchaV2(req.body['g-recaptcha-response'], (req.headers['x-forwarded-for'] || req.connection.remoteAddress))) 
			throw "Captcha failed"
		
		// Check if all necessary post fields exist
		//Only allow logged in users to view profiles
		if(!req.session.uid) throw {safe:"Must be logged in"} 
		
		let trid = parseInt(req.body.trid)
		if(!trid) throw "Thread reply ID not specified"
		if(!Number.isInteger(trid)) throw "Invalid thread id"

		//Get account and its roles
		let account = await accountAPI.fetchAccount(req.session.uid)

		var thisReply = await ThreadReplies.findById(trid)
		if(!thisReply) throw "This reply does not exist"
		if(thisReply.uid !== req.session.uid) throw "You can only edit your reply"
		var originalPost = await ThreadReplies.findOne({tid: thisReply.tid}).sort({_id: 1})
		var isOriginalPost = originalPost._id === parseInt(trid)

		//Escape content for safe HTMl display
		let safeContent = stripCombiningMarks(ThreadSanitizeHTML(req.body.content))

		//Converts the plain HTML text to a workable DOM
		let dom = new JSDOM(safeContent)

		//Adds nofollow to unwhitelisted links. Hopefully will discourage advertisement bots
		let allowedFollowDomains = (await ForumSettings.findOne({type: "allowedFollowDomains"})).value || []
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

		//Extract text content (Filter out HTML tags)
		let textContent = dom.window.document.body.textContent

		//Check if the content is family safe
		let isClean = phraseblacklist.isClean(textContent.toLowerCase())
		if(typeof isClean === "string") throw `Content contains blacklisted phrase: ${isClean}`

		//Sum of reputation
		var reputation = await accountAPI.SumReputation(req.session.uid)
		//<-20 rep cant edit or create replies
		if(reputation<=-20) throw "Your reputation is too low"

		//Content must exist and length between 10 - 5000 chars
		if(!('content' in req.body)) throw "Invalid content"
		//Patrons, VIPs, and users with 10+ rep get an increased OP character limit
		var characterLimit = await rolesAPI.isSupporter(account.roles) || reputation > 10 ? 15000 : 8000;
		//Original posts should have long content so it will have a higher chance of community engagement
		//Replies can be shorter since it may just be comments like "yes please"
		var minChars = isOriginalPost ? 20 : 5
		//Set reply limit according to post type (OP or reply)
		var maxChars = isOriginalPost ? characterLimit : 5000
		//Get text lenth, but don't count spaces and new lines
		if((textContent.match(/\w/g)||"").length < minChars || textContent.length > maxChars) throw `Content must be ${minChars}-${maxChars} chars`
	
		//Updates the thread reply
		response.threaddata = await ThreadReplies.updateOne({_id: trid}, {content: safeContent})

		//Log audit
		//Compare changes
		let oldDom = new JSDOM(thisReply.content)
		let oldTextContent = oldDom.window.document.body.textContent
		var diffd = jsdiff.diffSentences(oldTextContent, textContent)
		diffd = diffd.filter(part => part.added || part.removed)
		//Saves to DB
		var log = new ForumAuditLogs({
			time: Date.now(),
			type: "edit",
			trid: trid,
			content: diffd
		})
		await log.save()
		
		//Code hasn't exited, so assume success
		response.success = true
	} 
	catch(e){
		response.reason = "Server error"
		if(typeof e === "string") response.reason = e
		else if(e.safe && e.safe.length > 0) response.reason = e.safe;
		else console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;