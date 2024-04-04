const router = require('express').Router()
const mongoose = require("mongoose")

const ThreadReplies = mongoose.model("ThreadReplies")

// /api/thread/reply/verify

router.post("/", async (req, res, next) => {
	try{
		let response = {success: false}

		if(!req.session.uid) throw 'You must be logged in'

		let trid = parseInt(req.body.trid)
		if(!trid) throw "Thread reply id not specified"
		if(!Number.isInteger(trid)) throw "Invalid thread reply id"

		let reply = await ThreadReplies.findByIdAndUpdate(trid, {$unset: {verified: 1}})
		if(!reply) throw "Reply does not exist"
		
		//Code hasn't exited, so assume success
		response.success = true
		res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router;