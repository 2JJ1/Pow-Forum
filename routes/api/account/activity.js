const router = require("express").Router()
const mongoose = require('mongoose')

const { ProcessMentions } = require('../../../my_modules/pfapi')

const ThreadReplies = mongoose.model('ThreadReplies')
const Threads = mongoose.model('Threads')

// /api/account/activity

router.get("/", async (req, res, next) => {
	try {
        let response = {success: false}

        var fromTRID = parseInt(req.query.trid)
        if(isNaN(fromTRID)) throw "Invalid request"

        var byUID = parseInt(req.query.uid)
        if(isNaN(byUID)) throw "Invalid request"

        var replies = await ThreadReplies.find({uid: byUID, _id: { $lt: fromTRID }}).sort({_id: -1}).limit(16).lean()
        for(let reply of replies){
            //Grabs the first reply assigned to that thread
            let OP = await ThreadReplies.findOne({tid: reply.tid}).sort({_id: 1})
            reply.isOP = OP._id === reply._id
            var thread = await Threads.findById(reply.tid)
            reply.threadTitle = thread ? thread.title : "[Missing]"

            //Replaces mentions with a username and link to their profile
            reply.content = await ProcessMentions(reply.content)
        }

        response.moreFeedAvailable = replies.length > 15
        response.feed = replies.slice(0,15)

        //Report successful account creation
		response.success = true
        res.json(response)
	}
	catch(e){
        next(e)
	}
})

module.exports = router