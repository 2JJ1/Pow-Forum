const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require("escape-html")

const Categories = mongoose.model("Categories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/cateogories

router.post("/addcategory", async (req, res, next) => {
	try{
        let response = {success: false}

        if(!"name" in req.body) return res.status(400).send("Invalid request")
        let {name} = req.body

        // Sanitize category name

        if(name < 3 || name.length > 30) throw "Category name must be between 3-30 characters"
        name = escape(name)

        if(await Categories.findOne({name})) throw "This category already exists"
 
        //Create new category
        await new Categories({
            name,
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
                name,
            },
        })
        .save()
	} 
	catch(e){
		next(e)
	}
})

module.exports = router