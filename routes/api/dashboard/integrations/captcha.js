const router = require('express').Router()
const mongoose = require("mongoose")
const envfile = require('envfile')
const fs = require('fs')

const updateEnv = require('../../../../my_modules/updateenv')
const recaptcha = require('../../../../my_modules/captcha')

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
        if(secret !== "****") {
            updateEnv({CAPTCHA_APIKEY: secret})
        }
        updateEnv({CAPTCHA_SITEKEY: public})

        //Test is captcha auth is valid
        await recaptcha.captcha("xxxx", req.ip)
        .catch(e => {
            if(e['error-codes'].includes('invalid-input-secret')) {
                updateEnv({CAPTCHA_APIKEY: "", CAPTCHA_SITEKEY: ""})
                throw "Invalid Cloudflare Turnstile API key or secret"
            }
        })

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