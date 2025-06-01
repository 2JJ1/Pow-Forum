const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require('escape-html')

const accountAPI = require('../../../my_modules/accountapi')
const recaptcha = require('../../../my_modules/captcha')
const rolesAPI = require('../../../my_modules/rolesapi')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/account

router.delete("/", async (req, res, next) => {
	try{
        let response = {success: false}

        let {uid, grecaptcharesponse, password, reason, keepForumContent} = req.body
        if(!uid || !password) throw "Invalid request"

        //Prevent bots/spam with Google captcha
		let captchaResult = await recaptcha.captcha(grecaptcharesponse, req.ip)
		if(!captchaResult) throw "Captcha failed"

        let isAdmin = await rolesAPI.isAdmin(req.session.uid)
        if(!isAdmin) throw "Only admins may delete accounts"

        //Validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) throw "Incorrect password"

        //Check account exists
        let account = await accountAPI.fetchAccount(uid)
        if(!account) throw "Account does not exist"

        //Permissions check
        if(!await rolesAPI.isClientOverpowerTarget(req.session.uid, uid)) throw "You lack permissions over this user"

        reason = escape(reason)

        //Starts delete process
        await accountAPI.deleteAccount(uid, keepForumContent)
        
		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "Delete account",
            byUID: req.session.uid,
            targetUID: uid,
            reason,
            content: account.username,
        })
        .save()
	} 
	catch(e){
		next(e)
	}
})

module.exports = router