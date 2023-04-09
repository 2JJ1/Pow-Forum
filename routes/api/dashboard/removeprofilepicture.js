const router = require('express').Router()
const mongoose = require("mongoose")

const rolesapi = require("../../../my_modules/rolesapi")
const {deleteUploadedProfilePicture} = require("../../../my_modules/accountapi")

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Accounts = mongoose.model("Accounts")

// 	/api/dashboard/removeprofilepicture

router.delete("/removeprofilepicture", async (req, res, next) => {
	try{
		let response = {success: false}

        const targetUID = req.body.uid
        if(!targetUID) throw "Missing target user ID"

        if(!await rolesapi.isClientOverpowerTarget(req.session.uid, targetUID)) throw "No permission"

        var account = await Accounts.findById(targetUID)
		if(!account) throw "Account doesn't exist"

        //Delete their uploaded profile picture if they have one
        deleteUploadedProfilePicture(account._id)

        //Removes profile picture from db
        account.profilepicture = undefined
        await account.save()

		//Code hasn't exited, so assume success
		response.success = true
		res.json(response)

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
			type: "mod-delete-pfp",
            byUID: req.session.uid,
            targetUID,
		})
		.save()

	} 
	catch(e){
		next(e)
	}
})

module.exports = router