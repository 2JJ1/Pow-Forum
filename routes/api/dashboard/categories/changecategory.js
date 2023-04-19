const router = require('express').Router()
const mongoose = require("mongoose")

const buildErrorMessage = require("../../../../my_modules/errorMessages")

const Subcategories = mongoose.model("Subcategories")
const Categories = mongoose.model("Categories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard

router.post("/changecategory", async (req, res, next) => {
	try{
        let { currentId, newName } = req.body

        console.log(req.body)

        if(!("target" in req.body) || !("newCategory" in req.body)) {
            return res.status(400).send({success: false, error: buildErrorMessage("missingRequiredFields", "category")})
        }
        let {target, newCategory} = req.body

        //Fetch subcategory
        let subcategory = await Subcategories.findById(target)
        if(!subcategory) return res.status(400).send("Subcategory does not exist")

        //Check new category exists
        if(!await Categories.findOne({name: newCategory})) {
            return res.status(400).send({success: false, error: buildErrorMessage("doesNotExist", "category")})
        }

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
        
        res.send({success: true})

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
			type: "Rename category group",
            byUID: req.session.uid,
            currentId,
            newName
		})
		.save()
	} 
	catch(e){
		next(e)
	}
})

module.exports = router