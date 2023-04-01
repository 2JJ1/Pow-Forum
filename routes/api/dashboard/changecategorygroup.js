const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const Categories = mongoose.model("Categories")
const CategoryGroups = mongoose.model("CategoryGroups")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard

router.post("/changecategorygroup", async (req, res) => {
    let response = {success: false}

	try{
        if(!"category" in req.body || !"categoryGroup" in req.body) return res.status(400).send("Invalid body")
        let {category, categoryGroup} = req.body

        //Fetch category
        category = await Categories.findOne({name: category})
        if(!category) return res.status(400).send("Category does not exist")

        //Fetch category group
        categoryGroup = await CategoryGroups.findOne({name: categoryGroup})
        if(!categoryGroup) return res.status(400).send("Category group does not exist")

        //Process change
        category.group = categoryGroup.name

        //Officiate update
        await category.save()

        new ForumAuditLogs({
            time: Date.now(),
            type: "Change category group",
            byUID: req.session.uid,
            content: {
                category: category.name,
                group: categoryGroup.name
            },
        })
        .save()
        
		//Code hasn't exited, so assume success
		response.success = true

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
			type: "Rename category group",
            byUID: req.session.uid,
            currentName,
            newName
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