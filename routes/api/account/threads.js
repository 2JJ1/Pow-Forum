const router = require("express").Router()
const mongoose = require('mongoose')

const forumapi = require('../../../my_modules/forumapi')

const Threads = mongoose.model('Threads')
const ThreadReplies = mongoose.model('ThreadReplies')

// /api/account/thread

router.get("/", async (req, res) => {
    let response = {success: false}
	
	try {
		if(!/^[0-9]+$/.test(req.query.tid)) throw "Invalid request"
		var fromTID = parseInt(req.query.tid)

		if(!/^[0-9]+$/.test(req.query.uid)) throw "Invalid request"
        var byUID = parseInt(req.query.uid)

        var threads = await Threads.find({uid: byUID, _id: {$lt: fromTID}}).sort({_id: -1}).limit(16).lean()

		//Attach category information
        for(let thread of threads){
			let category = await forumapi.GetSubcategory(thread.category)
            thread.category = {
				name: category.name,
				name2: category._id,
			}
			thread.replies = await ThreadReplies.count({tid: thread._id}) - 1
        }

        response.moreAvailable = threads.length > 15
        response.threads = threads.slice(0,15)

        //Report successful account creation
		response.success = true
	}
	catch(error){
		if(typeof error === "string") response.reason = error
		else{
			console.warn(error)
			response.reason = "Server error"
		}
	}
	
	res.json(response)
})

module.exports = router