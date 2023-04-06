const router = require('express').Router()
const mongoose = require("mongoose")

const {ValidateEmail, extractHostname} = require('../../../../my_modules/other')

const ForumSettings = mongoose.model("ForumSettings")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/settings

router.post("/metadata", async (req, res) => {
    let response = {
        success: false,
    }

	try{
        let {name, description} = req.body

        //Sanitize and validate
        if(typeof name !== "string") throw "Invalid request"
        if(name.length === 1) throw "Forum name is too short"
        if(name.length > 30) throw "Forum name is too long"

        if(typeof description !== "string") throw "Invalid request"
        if(description.length <= 10) throw "Description is too short"
        if(description.length > 255) throw "Description is too long"

        // Save changes

        await ForumSettings.updateOne({type: "name"}, {value: name})
        await ForumSettings.updateOne({type: "description"}, {value: description})

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "Metadata updated",
            byUID: req.session.uid,
        })
        .save()
        //Don't fail request over rejected log
        .catch((e) => {console.error(e)})

		//Code hasn't exited, so assume success
		response.success = true
	} 
	catch(e){
		response.reason = "Server error"
		if (typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
})

module.exports = router