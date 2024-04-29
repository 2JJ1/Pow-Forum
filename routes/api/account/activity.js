const router = require("express").Router()
const mongoose = require('mongoose')

const { ProcessMentions } = require('../../../my_modules/pfapi')
const accountAPI = require('../../../my_modules/accountapi')
const rolesAPI = require('../../../my_modules/rolesapi')

const ThreadReplies = mongoose.model('ThreadReplies')
const Threads = mongoose.model('Threads')

// /api/account/activity

router.get("/", async (req, res, next) => {
	try {
        let response = {success: false}

        var byUID = parseInt(req.query.uid)
        if(!Number.isInteger(byUID)) throw "Invalid request"

        let filter = {
            verified: {$ne: false},
        }

        let fromTRID = parseInt(req.query.trid)
        if(Number.isInteger(fromTRID)) filter._id = {$lt: fromTRID}
        
        if(byUID !== 0) filter.uid = byUID

        var replies = await ThreadReplies.find(filter).sort({_id: -1}).limit(16).lean()
        for(let reply of replies){
            //Grabs the first reply assigned to that thread
            let OP = await ThreadReplies.findOne({tid: reply.tid}).sort({_id: 1})
            reply.isOP = OP._id === reply._id
            var thread = await Threads.findById(reply.tid)
            reply.threadTitle = thread ? thread.title : "[Missing]"

            //Replaces mentions with a username and link to their profile
            reply.content = await ProcessMentions(reply.content)
            
            if(byUID == 0){
                reply.isLowerRanked = await rolesAPI.isClientOverpowerTarget(req.session.uid, reply.uid)
                reply.account = await accountAPI.fetchAccount(reply.uid)
            }
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