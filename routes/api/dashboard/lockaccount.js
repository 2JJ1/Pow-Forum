const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require('escape-html')

const rolesapi = require("../../../my_modules/rolesapi")

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Accounts = mongoose.model("Accounts")

// 	/api/dashboard/lockaccount

router.post("/", async (req, res) => {
    let response = {success: false}

	try{
        let {uid, locked, reason} = req.body
        if(!uid) throw "Missing target user ID"
        if(!'locked' in req.body) throw "Missing locked state"

        if(uid == req.session.uid) throw "Can't affect self"

        if(!await rolesapi.isClientOverpowerTarget(req.session.uid, uid)) throw "No permission"

        var target = await Accounts.findById(uid)
		if(!target) throw "Account doesn't exist"

        reason = escape(reason)

        if(locked) target.locked = reason
        else target.locked = undefined

        await target.save()

		//Code hasn't exited, so assume success
		response.success = true

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
			type: "mod-lock-account",
            byUID: req.session.uid,
            targetUID: uid,
            value: target.locked,
            reason,
		})
		.save()
	} 
	catch(e){
		response.reason = "Server error"
		if(e.safe && e.safe.length > 0) response.reason = e.safe;
		else if (typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
})

module.exports = router