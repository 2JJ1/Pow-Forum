const express = require('express');
const router = express.Router();
var escape = require('escape-html');
const phraseblacklist = require('phrase-blacklist')
const stripCombiningMarks = require('strip-combining-marks')
const mongoose = require('mongoose')

const ThreadReplies = mongoose.model('ThreadReplies')
const Threads = mongoose.model('Threads')

/* 
Route: /v1/forum/thread/topic
Desc: Edits the thread topic
*/

router.patch('/', async (req, res) => {
	let response = {success: false}
	
	try {
		//Only allow logged in users to view profiles
		if(!req.session.uid) throw "You must be logged in to post"

		let tid = req.body.tid
		if(!tid) throw "Missing topic"
		if(typeof tid !== "number") throw "Invalid thread id"

		//Grabs original reply
		var OP = await ThreadReplies.findOne({tid}).sort({_id: 1})

		//Check if client owns this thread
		if(OP.uid !== req.session.uid) throw "Only the owner may edit the thread topic"

		//Check if thread edit time expired
		var threadEditExpires = new Date(OP.date)
		threadEditExpires.setMinutes(threadEditExpires.getMinutes() + 10)
		if(new Date() > threadEditExpires) throw "Your 10 minute topic edit window has closed"

		// Start sanitizing the topic
		let topic = req.body.topic
		if(!topic) throw "Missing topic"
		if(typeof topic !== "string") throw "Invalid topic"

		//Check that the topic is family friendly
		let isClean = phraseblacklist.isClean(topic.toLowerCase())
		if(typeof isClean === "string") throw `Topic contains blacklisted phrase: ${isClean}`
		
		//Removes unnecessary spaces from the ends
		topic = topic.trim()

		//Character count check
		if((topic.match(/\w/g)||"").length < 10 || topic.length > 250) throw "Topic must be 10-250 characters long"

		//Escapes the topic to prevent XSS
		topic = escape(topic)

		//Removes spammy looking text (Zalgo)
		topic = stripCombiningMarks(topic)

		//Updates database
		await Threads.updateOne({_id: tid}, {title: topic})

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