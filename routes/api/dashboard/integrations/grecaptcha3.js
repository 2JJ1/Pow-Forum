const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")
const envfile = require('envfile')
const fs = require('fs')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/integrations

router.post("/grecaptcha3", async (req, res) => {
    let response = {success: false}

	try{
        let {secret, public} = req.body

        //Sanitize and validate
        if(!secret) throw "Missing API key"
        if(secret !== "****" && !/^[\w-]{10,}$/.test(secret)) throw "Invalid API key"

        if(!public) throw "Missing site key"
        if(!/^[\w-]{10,}$/.test(public)) throw "Invalid site key"

        // Save changes
        let parsedEnv = envfile.parse(fs.readFileSync('.env', "utf8"))

        if(secret !== "****") {
            parsedEnv.CAPTCHAV3_APIKEY = secret
            process.env.CAPTCHAV3_APIKEY = secret
        }

        parsedEnv.CAPTCHAV3_SITEKEY = public
        process.env.CAPTCHAV3_SITEKEY = public

        fs.writeFileSync('.env', envfile.stringify(parsedEnv)) 

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "captcha v3 updated",
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