const router = require('express').Router()
const mongoose = require("mongoose")
const envfile = require('envfile')
const fs = require('fs')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/integrations

router.post("/coinbasecommerce", async (req, res, next) => {
	try{
        let response = { success: false }

        let {secret, webhookSecret} = req.body

        //Sanitize and validate
        if(!secret || (secret === "****" && !process.env.parsedEnv.COINBASE_API_KEY)) throw "Missing API key"
        if(secret !== "****" && !/^[\w-]{10,}$/.test(secret)) throw "Invalid API key"

        if(!webhookSecret || (webhookSecret === "****" && !process.env.COINBASE_WEBHOOK_SECRET)) throw "Missing webhook secret key"
        if(webhookSecret !== "****" && !/^[\w-]{10,}$/.test(webhookSecret)) throw "Invalid webook secret key"

        // Save changes
        let parsedEnv = envfile.parse(fs.readFileSync('.env', "utf8"))

        if(secret !== "****") {
            parsedEnv.COINBASE_API_KEY = secret
            process.env.COINBASE_API_KEY = secret
        }

        if(webhookSecret !== "****") {
            parsedEnv.COINBASE_WEBHOOK_SECRET = webhookSecret
            process.env.COINBASE_WEBHOOK_SECRET = webhookSecret
        }

        fs.writeFileSync('.env', envfile.stringify(parsedEnv)) 

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "coinbase commerce integration updated",
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