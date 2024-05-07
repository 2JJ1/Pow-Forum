const router = require('express').Router()
const mongoose = require("mongoose")

const rolesapi = require('../../../my_modules/rolesapi')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Threads = mongoose.model("Threads")
const PinnedThreads = mongoose.model("PinnedThreads")

// 	/api/thread

// Pins or unpins a thread
router.post('/togglepin', async (req, res, next) => {
	try{
        let response = {success: false}

        if(!req.session.uid) throw 'You must be logged in'

        var toggle = req.body.toggle || false
        
        let tid = parseInt(req.body.tid)
		if(!tid) throw "Thread ID not specified"
		if(!Number.isInteger(tid)) throw "Invalid thread reply id"

        var thread = await Threads.findById(tid)
        if(!thread) throw "This thread doesn't exist"

        if(!await rolesapi.isModerator(req.session.uid)) throw "You lack permissions"

        if(toggle === true) await new PinnedThreads({_id: tid}).save()
        else await PinnedThreads.deleteOne({_id: tid})
        
        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
			type: "thread-pin",
			tid: tid,
            byUID: req.session.uid,
            value: toggle,
		})
		.save()

        //No early exit, so must've passed
        response.success = true
        res.json(response)
    } 
    catch(e){
        next(e)
	}
});

module.exports = router;