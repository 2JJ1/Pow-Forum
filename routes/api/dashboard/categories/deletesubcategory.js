const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const Subcategories = mongoose.model("Subcategories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

const accountAPI = require('../../../../my_modules/accountapi')

// 	/api/dashboard

router.delete("/deletesubcategory", async (req, res) => {
    let response = {success: false}

	try{
        if(!"category" in req.body || !"password" in req.body) return res.status(400).send("Invalid body")
        let {category, password} = req.body

        //First validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) throw "Incorrect password"

        //Delete the category
        await Subcategories.deleteOne({name: category})

        //Delete related threads
        await Threads.deleteMany({category})
        await ThreadReplies.deleteMany({category})
        //TODO- Delete info related to thread replies(reacts...)
        
		//Code hasn't exited, so assume success
		response.success = true

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "Delete category",
            byUID: req.session.uid,
            content: {
                category,
            },
        })
        .save()
	} 
	catch(e){
		response.reason = "Server error"
		if (typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
})

module.exports = router