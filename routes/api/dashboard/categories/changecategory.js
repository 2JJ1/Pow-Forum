const router = require('express').Router()
const mongoose = require("mongoose")

const Subcategories = mongoose.model("Subcategories")
const Categories = mongoose.model("Categories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard

router.post("/changecategory", async (req, res, next) => {
	try{
        let response = {success: false}

        if(!"category" in req.body || !"categoryGroup" in req.body) return res.status(400).send("Invalid body")
        let {target, newCategory} = req.body

        //Fetch subcategory
        let subcategory = await Subcategories.findById(target)
        if(!subcategory) return res.status(400).send("Subcategory does not exist")

        //Check new category exists
        if(!await Categories.findOne({name: newCategory})) return res.status(400).send("Category does not exist")

        //Process change
        subcategory.category = newCategory

        //Officiate update
        await subcategory.save()

        new ForumAuditLogs({
            time: Date.now(),
            type: "Change category group",
            byUID: req.session.uid,
            content: {
                old: subcategory.name,
                new: newCategory
            },
        })
        .save()
        
		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)

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
		next(e)
	}
})

module.exports = router