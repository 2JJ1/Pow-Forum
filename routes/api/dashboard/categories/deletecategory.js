const router = require('express').Router()
const mongoose = require("mongoose")

const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

const accountAPI = require('../../../../my_modules/accountapi')

// 	/api/dashboard/categories

router.delete("/deletecategory", async (req, res, next) => {
	try{
        let response = {success: false}

        if(!"name" in req.body || !"password" in req.body) return res.status(400).send("Invalid body")
        let {name, password} = req.body

        //First validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) throw "Incorrect password"

        //Delete the category
        await Categories.deleteOne({name})

        //Delete related threads of all child categories
        let subCategories = await Subcategories.find({category: name})
        for(let subCategory of subCategories){
            //Delete related threads
            await Threads.deleteMany({category: subCategory._id})
            await ThreadReplies.deleteMany({category: subCategory._id})
            //TODO- Delete info related to thread replies(reacts...)
            await subCategory.deleteOne()
        }

		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "Delete category",
            byUID: req.session.uid,
            content: {
                category: name,
            },
        })
        .save()
	} 
	catch(e){
		next(e)
	}
})

module.exports = router