const router = require("express").Router()
const mongoose = require('mongoose')

const forumapi = require('../../../my_modules/forumapi')

const Threads = mongoose.model('Threads')

// /api/account/activity

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
			let category = await forumapi.GetCategory(thread.forum)
            thread.category = {
				name: category.name,
				name2: category.database,
			}
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
			res.reason = "Server error"
		}
	}
	
	res.json(response)
})

module.exports = router