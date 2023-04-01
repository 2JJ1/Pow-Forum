const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")
const escape = require("escape-html")

const CategoryGroups = mongoose.model("CategoryGroups")
const Categories = mongoose.model("Categories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard

router.post("/addsubcategory", async (req, res) => {
    let response = {success: false}

	try{
        if(!"name" in req.body || !"description" in req.body || !"requiredRoles" in req.body || !"group" in req.body) return res.status(400).send("Invalid body")
        let {name, description, requiredRoles, group} = req.body

        //Sanitize category name
        if(name < 3 || name.length > 30) throw "Category name must be between 3-30 characters"
        name = escape(name)
         // *Future* Make it so category names can be reused
        if(await Categories.findOne({name})) throw "This category already exists"
 
        //Sanitize description
        if(description < 3 || description.length > 250) throw "Description length must be between 3-250 characters"
        description = escape(description)

        //Process required roles
        try {
			if(requiredRoles) requiredRoles = JSON.parse(requiredRoles);
		}
        catch (e) {
			throw "Required roles must be a JSON style array"
		}

        //It must be added to an existing group
        group = await CategoryGroups.findOne({name: group})
        if(!group) return res.status(400).send("This category group does not exist")

        //Create new category
        await new Categories({
            name,
            description,
            requiredRoles,
            group: group.name,
            database: name.toLowerCase()
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
                category: name,
                group: group.name,
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