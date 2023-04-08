const router = require('express').Router()
const mongoose = require("mongoose")

const ThreadReplies = mongoose.model("ThreadReplies")

// /api/thread/reply

router.get("/", async (req, res) => {
	let response = {success: false}
	
	try{
		/* In normal behavior, only the edit button triggers this endpoint
		That said, they'd be logged in. If not logged in, likely forged bot request */
		if(!req.session.uid) throw 'You must be logged in'

		let trid = parseInt(req.query.trid)
		if(!trid) throw "Thread reply id not specified"
		if(!Number.isInteger(trid)) throw "Invalid thread reply id"

		//Adds the active forumer role if they have over 150 replies (Excluding OPs)
		let reply = await ThreadReplies.findById(trid)
		if(!reply) throw "Reply does not exist"

		response.html = reply.content
			
		//Code hasn't exited, so assume success
		response.success = true
	} catch(e){
		response.reason = "Server error"
		if (typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
})

module.exports = router;