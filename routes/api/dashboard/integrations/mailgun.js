const router = require('express').Router()
const mongoose = require("mongoose")
const envfile = require('envfile')
const fs = require('fs')

const {ValidateEmail, extractHostname} = require('../../../../my_modules/other')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/integrations

router.post("/mailgun", async (req, res) => {
    let response = {success: false}

	try{
        let {domain, secret, senderEmail} = req.body

        //Sanitize and validate
        if(!domain) throw "Missing domain"
        domain = extractHostname(domain)
        if(domain.length < 5) throw "Invalid domain"

        if(!senderEmail) throw "Missing sender email address"
        if(!ValidateEmail(senderEmail)) throw "Invalid email address"

        if(!secret) throw "Missing API key"
        if(secret !== "****" && !/^[\w-]{10,}$/.test(secret)) throw "Invalid API key"

        // Save changes

        let parsedEnv = envfile.parse(fs.readFileSync('.env', "utf8"))

        parsedEnv.MAILGUN_DOMAIN = senderEmail
        process.env.MAILGUN_DOMAIN = domain

        if(secret !== "****") {
            parsedEnv.MAILGUN_APIKEY = secret
            process.env.MAILGUN_APIKEY = secret
        }

        parsedEnv.MAILGUN_NOREPLY_ADDRESS = senderEmail
        process.env.MAILGUN_NOREPLY_ADDRESS = senderEmail

        fs.writeFileSync('.env', envfile.stringify(parsedEnv)) 

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "Mailgun integration updated",
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