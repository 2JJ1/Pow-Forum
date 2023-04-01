const express = require('express');
const mongoose = require("mongoose")

const rolesapi = require('../../my_modules/rolesapi');

const router = express.Router();
const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Threads = mongoose.model("Threads")
const PinnedThreads = mongoose.model("PinnedThreads")

// 	/v1/forum/togglethreadpin

// Pins or unpins a thread
router.post('/', async (req, res) => {
	let response = {success: false}
	
	try{
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
    } 
    catch(e){
		response.reason = "Server error"
		if(typeof e === "string") response.reason = e;
		else console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;