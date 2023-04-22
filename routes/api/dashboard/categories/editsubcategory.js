const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require("escape-html")

const Subcategories = mongoose.model("Subcategories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/categories

router.post("/editsubcategory", async (req, res, next) => {
	try{
        let response = { success: false }
        
        let {id, currentName, newName, newDescription, requiredRoles} = req.body
        console.log(id, currentName, newName, newDescription, requiredRoles)
        if(!id || !currentName || !newName || !newDescription) throw "Invalid request"

        //Sanitize name
        if(newName < 3 || newName.length > 30) throw "Category name must be between 3-30 characters"
        newName = escape(newName)

        //Sanitize description
        if(newDescription < 3 || newDescription.length > 250) throw "Description length must be between 3-250 characters"
        newDescription = escape(newDescription)

        //Fetch category
        let category = await Subcategories.findById(id)
        if(!category) throw "Category does not exist"

        // Process update
        if(category.name !== newName){
            category.name = newName

            new ForumAuditLogs({
                time: Date.now(),
                type: "Rename category",
                byUID: req.session.uid,
                content: {
                    oldName: currentName,
                    newName
                },
            })
            .save()
        }

        if(category.description !== newDescription){
            category.description = newDescription

            new ForumAuditLogs({
                time: Date.now(),
                type: "Change subcategory description",
                byUID: req.session.uid,
                content: {
                    category: newName,
                    description: newDescription,
                },
            })
            .save()
        }


        //Process required roles
        requiredRoles = requiredRoles.trim()
        if(requiredRoles) requiredRoles = requiredRoles.split(",")
        else requiredRoles = []
        if(JSON.stringify(category.requiredRoles) !== JSON.stringify(requiredRoles)){
            category.requiredRoles = requiredRoles
            if(requiredRoles.length == 0) category.requiredRoles = undefined

            new ForumAuditLogs({
                time: Date.now(),
                type: "sategory required roles",
                byUID: req.session.uid,
                content: {
                    id,
                    requiredRoles: JSON.stringify(requiredRoles),
                },
            })
            .save()
        }

        //Officiate update
        await category.save()
        
		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router