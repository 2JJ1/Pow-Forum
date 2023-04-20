const router = require('express').Router()
const mongoose = require("mongoose")
const envfile = require('envfile')
const fs = require('fs')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/integrations

router.post("/captcha", async (req, res, next) => {
	try{
        let response = {success: false}

        let {secret, public} = req.body

        //Sanitize and validate
        if(!secret) throw "Missing API key"
        if(secret !== "****" && !/^[\w-]{10,}$/.test(secret)) throw "Invalid API key"

        if(!public) throw "Missing site key"
        if(!/^[\w-]{10,}$/.test(public)) throw "Invalid site key"

        // Save changes
        let parsedEnv = envfile.parse(fs.readFileSync('.env', "utf8"))

        if(secret !== "****") {
            parsedEnv.CAPTCHA_APIKEY = secret
            process.env.CAPTCHA_APIKEY = secret
        }

        parsedEnv.CAPTCHA_SITEKEY = public
        process.env.CAPTCHA_SITEKEY = public

        fs.writeFileSync('.env', envfile.stringify(parsedEnv)) 

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "captcha v2 updated",
            byUID: req.session.uid,
        })
        .save()
        //Don't fail request over rejected log
        .catch((e) => {console.error(e)})

		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router