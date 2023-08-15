const router = require("express").Router()
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const bcrypt = require("bcrypt")

let accountAPI = require("../../my_modules/accountapi")
let updateEnv = require("../../my_modules/updateenv")
const { SendBasicEmail } = require('../../my_modules/email')
const { isSetup } = require("../../server")

const ForumSettings = mongoose.model("ForumSettings")
const Accounts = mongoose.model("Accounts")

router.get("/", async (req, res) => {
    if(isSetup()) res.status(400).render("400", {"reason": `It seems initial configuration is already complete. Please restart the Node.js server to display the normal website.`})
    else res.render("pages/install/index")
})

// parse application/json
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json({limit: '5mb'}))

router.post("/api/setup", async (req, res, next) => {
    try {
        let {name, url, email, username, password, mailgunDomain, mailgunSecret} = req.body

        if(isSetup()) throw  "It seems initial configuration is already complete. Please restart the Node.js server to display the normal website."

        // Sanitize and validate

        if(typeof name !== "string") throw "Invalid request"
        if(!name.length) throw "Forum name is too short"
        if(name.length > 30) throw "Forum name is too long"

        let parsedURL
        try {
            parsedURL = new URL(url)
            parsedURL.topLevelDomain = parsedURL.hostname.split(".").splice(-2).join(".")
        }
        catch(e) {
            throw "Invalid forum URL"
        }

        await accountAPI.validateEmail(email, { bypassMajorEmail: true })

        await accountAPI.validateUsername(username)

        if(!password) throw "Missing password"
		let validatedPassword = accountAPI.ValidatePassword(password)
		if(validatedPassword !== true) throw validatedPassword
        password = await bcrypt.hash(password, 10)

        //This also validates the Mailgun API credentials
        process.env.MAILGUN_DOMAIN = mailgunDomain
        process.env.MAILGUN_APIKEY = mailgunSecret
        await SendBasicEmail(email, "Powrum Initial Configuration", `Please restart the Node.js server for the configuration to fully process and display the normal website. Your admin account username is ${username}. When you login to your account, visit the dashboard to further customize your forum. Thank you for using Powrum.`)
        .catch(e => {
            if(e.statusCode === 401) throw "Invalid Mailgun API credentials"
            else throw e
        })

        // Update all fields if there are no prior issues

        //Sets forum name
        await ForumSettings.findOneAndUpdate({type: "name"}, {value: name}, {upsert: true})

        //Sets forum URL
        updateEnv({COOKIE_DOMAIN: parsedURL.hostname === 'localhost' ? 'localhost' : `.${parsedURL.topLevelDomain}`})
		updateEnv({FORUM_URL: parsedURL.hostname !== 'localhost' ? parsedURL.origin : `${parsedURL.protocol}//${parsedURL.hostname}:${process.env.PORT || 8087}`})


        //Creates admin account
        await new Accounts({
			email, 
			username, 
			password,
            roles: '["admin"]'
		})
		.save()

        updateEnv({
            MAILGUN_DOMAIN: mailgunDomain,
            MAILGUN_APIKEY: mailgunSecret,
        })

        res.json({success: true})
    } 
	catch(e){
		next(e)
	}
})

module.exports = router