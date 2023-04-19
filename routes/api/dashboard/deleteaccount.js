const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require('escape-html')

const accountAPI = require('../../../my_modules/accountapi')
const recaptcha = require('../../../my_modules/captcha')
const rolesAPI = require('../../../my_modules/rolesapi')

const Accounts = mongoose.model("Accounts")
const PasswordResetSessions = mongoose.model("PasswordResetSessions")
const Sessions = mongoose.model("Sessions")
const Logs = mongoose.model("Logs")
const LoginHistories = mongoose.model("LoginHistories")
const Messages = mongoose.model("Messages")
const TFAs = mongoose.model("TFAs")
const NotificationSettings = mongoose.model("NotificationSettings")
const Notifications = mongoose.model("Notifications")
const AltAccounts = mongoose.model("AltAccounts")
const ActiveUsers = mongoose.model("ActiveUsers")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const PinnedThreads = mongoose.model("PinnedThreads")
const Reputations = mongoose.model("Reputations")
const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/account

router.delete("/", async (req, res, next) => {
	try{
        let response = {success: false}

        if(!("uid" in req.body) || !("grecaptcharesponse" in req.body) || !("password" in req.body)) return res.status(400).send("Invalid body")
        let {uid, grecaptcharesponse, password, reason, keepForumContent} = req.body

        //Prevent bots/spam with Google captcha
		let captchaResult = await recaptcha.captcha(grecaptcharesponse, (req.headers['x-forwarded-for'] || req.connection.remoteAddress))
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
        await Accounts.deleteOne({_id: uid})
        await PasswordResetSessions.deleteOne({uid})
        await Sessions.deleteMany({session: new RegExp(`"uid":${req.session.uid}[},]`)})
        await Logs.deleteMany({uid})
        await LoginHistories.deleteMany({uid})
        await Messages.deleteMany({$or: [{from: uid}, {to: uid}]})
        await TFAs.deleteOne({_id: uid})
        await NotificationSettings.deleteOne({_id: uid})
        await Notifications.deleteMany({$or: [{senderid: uid}, {recipientid: uid}]})
        await AltAccounts.deleteOne({_id: uid})
        await ActiveUsers.deleteOne({uid})

        if(!keepForumContent){
            let threads = await Threads.find({uid})
            //Deletes replies to their threads
            for (let thread of threads){
                await ThreadReplies.deleteMany({tid: thread._id})
                await PinnedThreads.deleteOne({_id: thread._id})
            }
            //Deletes their threads
            await Threads.deleteMany({uid})
            //Deletes their replies on other threads
            await ThreadReplies.deleteMany({uid})
            await Reputations.deleteMany({$or: [{from: uid}, {for: uid}]})
            await ThreadReplyReacts.deleteMany({uid})
        }
        //Otherwise deletes content that'd be unviewable anyway
        else{
            await Reputations.deleteMany({for: uid})
        }
        
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