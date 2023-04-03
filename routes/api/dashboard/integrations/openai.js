const router = require('express').Router()
const mongoose = require("mongoose")
const envfile = require('envfile')
const fs = require('fs')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/integrations

router.post("/openai", async (req, res) => {
    let response = {success: false}

	try{
        let {secret} = req.body

        //Sanitize and validate
        if(!secret || (secret === "****" && !process.env.parsedEnv.OPENAI_API_KEY)) throw "Missing API key"
        if(secret !== "****" && !/^[\w-]{10,}$/.test(secret)) throw "Invalid API key"

        // Save changes
        let parsedEnv = envfile.parse(fs.readFileSync('.env', "utf8"))

        if(secret !== "****") {
            parsedEnv.OPENAI_API_KEY = secret
            process.env.OPENAI_API_KEY = secret
        }

        fs.writeFileSync('.env', envfile.stringify(parsedEnv)) 

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "openai integration updated",
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