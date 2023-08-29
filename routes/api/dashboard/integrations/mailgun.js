const router = require('express').Router()
const mongoose = require("mongoose")

const {ValidateEmail, extractHostname} = require('../../../../my_modules/other')
const updateEnv = require('../../../../my_modules/updateenv')
const {SendBasicEmail} = require('../../../../my_modules/email')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/integrations

router.post("/mailgun", async (req, res, next) => {
	try{
        let response = {success: false}

        let {domain, secret} = req.body

        //Sanitize and validate
        if(!domain) throw "Missing domain"
        domain = extractHostname(domain)
        if(domain.length < 5) throw "Invalid domain"

        if(!secret) throw "Missing API key"
        if(secret !== "****" && !/^[\w-]{10,}$/.test(secret)) throw "Invalid API key"

        // Save changes
        let oldAPIKey = process.env.MAILGUN_APIKEY
        let oldMailgunDomain = process.env.MAILGUN_DOMAIN
        if(secret !== "****") {
            updateEnv({MAILGUN_APIKEY: secret})
        }
        updateEnv({MAILGUN_DOMAIN: domain})

        //Validate Mailgun credentials
        await SendBasicEmail("spam@spam.com", 'Credentials validation', 'Credentials validation')
        .catch(e => {
            if(e.statusCode === 401) {
                updateEnv({MAILGUN_APIKEY: oldAPIKey, MAILGUN_DOMAIN: oldMailgunDomain})
                throw "Invalid Mailgun API credentials"
            }
            else throw e
        })

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
        res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router