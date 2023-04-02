const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")
const escape = require("escape-html")

const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard

router.post("/editcategorygroupname", async (req, res) => {
    let response = {success: false}

	try{
        if(!"currentName" in req.body || !"newName" in req.body) return res.status(400).send("Invalid body")
        let {currentName, newName} = req.body
        
        //Sanitize name
        if(newName < 3 || newName.length > 30) throw "Category name must be between 3-30 characters"
        newName = escape(newName)

        let category = await Categories.findOneAndUpdate({name: currentName}, {name: newName})
        if(!category) return res.status(400).send("Category group does not exist")

        let subcategories = await Subcategories.find({category: currentName})
        for (let subcategory of subcategories){
            subcategory.category = newName
            await subcategory.save()
        }

		//Code hasn't exited, so assume success
		response.success = true

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
			type: "Rename category group",
            byUID: req.session.uid,
            content: {
                oldName: currentName,
                newName,
            }
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