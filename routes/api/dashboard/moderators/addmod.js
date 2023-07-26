const router = require('express').Router()
const mongoose = require("mongoose")

const {EscapeRegex} = require('../../../../my_modules/other')
const accountAPI = require("../../../../my_modules/accountapi")
const rolesAPI = require("../../../../my_modules/rolesapi")

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Accounts = mongoose.model("Accounts")

// 	/api/dashboard/moderators

router.post("/addmod", async (req, res, next) => {
	try{
        let response = { success: false }

        let {username} = req.body

        //Sanitize and validate
        if(typeof username !== "string") throw "Invalid request"
        username = EscapeRegex(username)

        //Fetch account
        let account = await accountAPI.fetchAccount(username)

        if(!account) throw "Account does not exist"

        if(await rolesAPI.isModerator(account.roles)) throw "User is already a moderator"

        account.roles.push("moderator")

        await Accounts.findByIdAndUpdate(account._id, {roles: JSON.stringify(account.roles)})

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "new-moderator",
            byUID: req.session.uid,
            value: account.uid
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