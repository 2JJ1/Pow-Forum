const router = require('express').Router()
const mongoose = require('mongoose')

const pfAPI = require('../../../my_modules/pfapi')

const ThreadReplies = mongoose.model('ThreadReplies')
const Threads = mongoose.model('Threads')

/* 
Route: /api/thread/topic
Desc: Edits the thread topic
*/

router.patch('/topic', async (req, res, next) => {
	try {
		let response = {success: false}

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
		topic = pfAPI.validateTopic(topic)

		//Updates database
		await Threads.updateOne({_id: tid}, {title: topic})

		response.success = true
		res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router;