const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require("escape-html")

const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/categories

router.post("/addsubcategory", async (req, res, next) => {
	try{
        let response = {success: false}

        if(!"name" in req.body || !"description" in req.body || !"requiredRoles" in req.body || !"group" in req.body) return res.status(400).send("Invalid body")
        let {name, description, requiredRoles, group} = req.body

        //Sanitize category name
        if(name < 3 || name.length > 30) throw "Category name must be between 3-30 characters"
        name = escape(name)
         // *Future* Make it so category names can be reused
        if(await Subcategories.findOne({name})) throw "This category already exists"
 
        //Sanitize description
        if(description < 3 || description.length > 250) throw "Description length must be between 3-250 characters"
        description = escape(description)

        //Process required roles
        requiredRoles = requiredRoles.trim()
        if(requiredRoles) requiredRoles = requiredRoles.split(",")
        else requiredRoles = []
        if(requiredRoles.length == 0) requiredRoles = undefined

        //It must be added to an existing group
        let category = await Categories.findOne({name: group})
        if(!category) return res.status(400).send("This category does not exist")

        //Create new category
        await new Subcategories({
            name,
            description,
            requiredRoles,
            category: category.name,
        })
        .save()
        
		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)

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
		next(e)
	}
})

module.exports = router