const express = require('express');
const router = express.Router();
const path = require("path")
const fs = require("fs")
const mongoose = require("mongoose")

const rolesapi = require("../../../my_modules/rolesapi")

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Accounts = mongoose.model("Accounts")

// 	/api/dashboard/removeprofilepicture

router.delete("/removeprofilepicture", async (req, res) => {
    let response = {success: false}

	try{
        const targetUID = req.body.uid
        if(!targetUID) throw "Missing target user ID"

        if(!await rolesapi.isClientOverpowerTarget(req.session.uid, targetUID)) throw "No permission"

        var account = await Accounts.findById(targetUID)
		if(!account) throw "Account doesn't exist"

        //Delete their uploaded profile picture if they have one
        if(account.profilepicture && !account.profilepicture.startsWith("https://")) {
            let avatarspath = path.resolve('../CDN/images/avatars') // relative to server.js
            let oldPFPPath = path.join(avatarspath, account.profilepicture)
            if(fs.existsSync(oldPFPPath)) fs.unlinkSync(oldPFPPath)
            else console.log(`Failed to delete old PFP ${oldPFPPath} for ${req.session.uid}`)
        }

        //Removes profile picture from db
        account.profilepicture = undefined
        await account.save()

		//Code hasn't exited, so assume success
		response.success = true

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
		response.reason = "Server error"
		if(e.safe && e.safe.length > 0) response.reason = e.safe;
		else if (typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
})

module.exports = router