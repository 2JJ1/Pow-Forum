const router = require('express').Router()
const mongoose = require("mongoose")

const rolesapi = require('../../my_modules/rolesapi')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Threads = mongoose.model('Threads')

// 	/v1/forum/togglethreadlock

// Locks or unlocks a thread
router.post('/', async (req, res) => {
	let response = {success: false}
	
	try{
		//Only allow logged in users to view profiles
        if(!req.session.uid) throw 'You must be logged in'

        //What thread to toggle
        let tid = parseInt(req.body.tid)
		if(!tid) throw "Thread ID not specified"
		if(!Number.isInteger(tid)) throw "Invalid thread reply id"

        //Lock state
        var toggle = req.body.toggle || false

        //Fetch thread
        var thread = await Threads.findById(tid)
        if(!thread) throw "This thread doesn't exist"

        //Check permissions
        if(!await rolesapi.isClientOverpowerTarget(req.session.uid, thread.uid)) throw "You lack permissions"

        //Update the thread's lock state
        thread.locked = toggle
        await thread.save()

        //Log audit
		var log = new ForumAuditLogs({
            time: Date.now(),
			type: "thread-lock",
			tid: tid,
            byUID: req.session.uid,
            value: toggle,
		})
		await log.save()

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