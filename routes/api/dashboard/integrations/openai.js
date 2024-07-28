const router = require('express').Router()
const mongoose = require("mongoose")
const { Configuration, OpenAIApi } = require("openai")

const updateENV = require('../../../../my_modules/updateenv')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/integrations

router.post("/openai", async (req, res, next) => {
	try{
        let response = {success: false}

        let {secret} = req.body

        //Sanitize and validate
        if(!secret || (secret === "****" && !process.env.parsedEnv.OPENAI_API_KEY)) throw "Missing API key"
        if(secret !== "****" && !/^[\w-]{10,}$/.test(secret)) throw "Invalid API key"

        // Save changes
        if(secret === "****") throw "No change detected"

        //Validate OpenAI auth
        let configuration = new Configuration({
            apiKey: secret,
        })
        let openai = new OpenAIApi(configuration)
        await openai.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [
                {role: "user", content: "Hello world!"}
            ],
            temperature: 0.5,
            max_tokens: 100,
            top_p: 1.0,
            frequency_penalty: 0.5,
            presence_penalty: 0.0,
            user: "0",
        })
        .catch(e => {
            if(e?.response?.status === 401) throw "Invalid OpenAI API key"
            else if (e?.response?.status === 429) throw "Failed to test OpenAI API key due to rate limit..."
            else {
                console.error(e)
                throw "Unhandled error occured"
            }
        })

        //Save new OpenAI auth
        updateENV({OPENAI_API_KEY: secret})

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
        res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router