const router = require('express').Router()
const mongoose = require("mongoose")

const {ValidateEmail, extractHostname} = require('../../../../my_modules/other')

const ForumSettings = mongoose.model("ForumSettings")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/settings

router.post("/globalHeadInsert", async (req, res, next) => {
	try{
        let response = { success: false }

        let {markup} = req.body

        //Validate
        if(typeof markup !== "string") throw "Invalid request"

        // Save changes
        await ForumSettings.updateOne({type: "globalHeadInsert"}, {value: markup}, {upsert: true})

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "globalHeadInsert updated",
            byUID: req.session.uid,
        })
        .save()
        //Don't fail request over rejected log
        .catch((e) => {console.error(e)})

        //Future note, consider emailing admins since this can critically affect security

		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router