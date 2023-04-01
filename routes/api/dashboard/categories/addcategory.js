const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")
const escape = require("escape-html")

const CategoryGroups = mongoose.model("CategoryGroups")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/cateogories

router.post("/addcategory", async (req, res) => {
    let response = {success: false}

	try{
        if(!"name" in req.body) return res.status(400).send("Invalid request")
        let {name} = req.body

        // Sanitize category name

        if(name < 3 || name.length > 30) throw "Category name must be between 3-30 characters"
        name = escape(name)

        if(await CategoryGroups.findOne({name})) throw "This category already exists"
 
        //Create new category
        await new CategoryGroups({
            name,
        })
        .save()
        
		//Code hasn't exited, so assume success
		response.success = true

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "Add category",
            byUID: req.session.uid,
            content: {
                name,
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