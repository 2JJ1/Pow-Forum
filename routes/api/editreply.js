const router = require('express').Router()
const phraseblacklist = require('phrase-blacklist')
const mongoose = require("mongoose")
const jsdiff = require("diff")
const jsdom = require("jsdom")

const rolesAPI = require('../../my_modules/rolesapi')
const accountAPI = require('../../my_modules/accountapi')
const { ThreadSanitizeHTML } = require('../../my_modules/other')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const ForumSettings = mongoose.model("ForumSettings")
const ThreadReplies = mongoose.model("ThreadReplies") 

const { JSDOM } = jsdom;
 
// 	/api/r

// Post to client's wall
router.post('/edit', async (req, res, next) => {
	try{
		let response = {success: false}

		// Check if all necessary post fields exist
		//Only allow logged in users to view profiles
		if(!req.session.uid) throw "Must be logged in"

		let { trid, content } = req.body
		
		trid = parseInt(trid)
		if(!trid) throw "Thread reply ID not specified"
		if(!Number.isInteger(trid)) throw "Invalid thread id"

		if(!content) throw "Missing content"
		if(typeof content !== "string") throw "Invalid request"
		if(content.length > 20000) throw "Content contains too much HTML data"

		//Get account and its roles
		let account = await accountAPI.fetchAccount(req.session.uid)

		var thisReply = await ThreadReplies.findById(trid)
		if(!thisReply) throw "This reply does not exist"
		if(thisReply.uid !== req.session.uid) throw "You can only edit your reply"
		var originalPost = await ThreadReplies.findOne({tid: thisReply.tid}).sort({_id: 1})
		var isOriginalPost = originalPost._id === parseInt(trid)

		//Escape content for safe HTMl display
		let safeContent = ThreadSanitizeHTML(content)

		//Converts the plain HTML text to a workable DOM
		let dom = new JSDOM(safeContent)

		//Adds nofollow to unwhitelisted links. Hopefully will discourage advertisement bots
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

		//Extract text content (Filter out HTML tags)
		let textContent = dom.window.document.body.textContent

		//Check if the content is family safe
		let isClean = phraseblacklist.isClean(textContent.toLowerCase())
		if(typeof isClean === "string") throw `Content contains blacklisted phrase: ${isClean}`

		//Sum of reputation
		var reputation = await accountAPI.SumReputation(req.session.uid)
		//<-20 rep cant edit or create replies
		if(reputation<=-20) throw "Your reputation is too low"

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
		res.json(response)
	} 
	catch(e){
		next(e)
	}
});

module.exports = router;