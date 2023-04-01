const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const Categories = mongoose.model("Categories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

const accountAPI = require('../../../my_modules/accountapi')

// 	/api/dashboard

router.delete("/deletecategory", async (req, res) => {
    let response = {success: false}

	try{
        if(!"category" in req.body || !"password" in req.body) return res.status(400).send("Invalid body")
        let {category, password} = req.body

        //First validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) throw "Incorrect password"

        //Delete the category
        await Categories.deleteOne({name: category})
        
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