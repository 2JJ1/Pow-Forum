const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require('escape-html')

const accountAPI = require('../../../my_modules/accountapi')
const rolesAPI = require('../../../my_modules/rolesapi')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Accounts = mongoose.model("Accounts")
const AltAccounts = mongoose.model("AltAccounts")
const Bans = mongoose.model("Bans")

router.post("/", async (req, res, next) => {
	try{
        let response = {success: false}

        let {uid, reason} = req.body
        if(!uid) throw "Missing target user ID"
        if(uid == req.session.uid) throw "You cannot ban yourself"

        reason = escape(reason)

        let account = await Accounts.findById(uid)
        if(!account) throw "This account does not exist"

        //Permissions check
        if(!await rolesAPI.isClientOverpowerTarget(req.session.uid, uid)) throw "You lack permissions over this user"

        //Ban all recently associated IPs
        for (let ip of (await accountAPI.findAlts({uid})).ips){
            await Bans.findOneAndUpdate({ ip }, { $setOnInsert: { ip } }, { upsert: true })
        }

        //Delete all historically associated accounts
        let altAccounts = await AltAccounts.findById(uid)
        .then(doc => doc?.matches ? Object.keys(doc.matches) : [])
        for (let altUid of altAccounts){
            if((req.session.uid != altUid) && await rolesAPI.isClientOverpowerTarget(req.session.uid, altUid)) {
                await accountAPI.deleteAccount(altUid, false)
            }
        }

        //Ban and delete the target account
        await Bans.findOneAndUpdate({ email: account.email }, { $setOnInsert: { email: account.email } }, { upsert: true })
        await Bans.findOneAndUpdate({ username: account.username }, { $setOnInsert: { username: account.username } }, { upsert: true })
        await accountAPI.deleteAccount(uid, false)

		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
			type: "mod-ban-account",
            byUID: req.session.uid,
            targetUID: uid,
            reason,
		})
		.save()
	} 
	catch(e){
		next(e)
	}
})

module.exports = router