const router = require('express').Router()
const mongoose = require("mongoose")

const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

const accountAPI = require('../../../../my_modules/accountapi')

// 	/api/dashboard/categories

router.delete("/deletecategory", async (req, res, next) => {
	try{
        let response = { success: false }

        let {name, password} = req.body
        if(!name || !password) throw "Invalid request"
        
        //First validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) throw "Incorrect password"

        //Delete the category
        await Categories.deleteOne({name})

        //Delete related threads of all child categories
        let subCategories = await Subcategories.find({category: name})
        for(let subCategory of subCategories){
            //Delete thread replies and it's associated data
            let cursor = Threads.find({category: subCategory._id}).cursor()
            for await (const thread of cursor) {
                let replies = await ThreadReplies.find({tid: thread._id})
                for (const reply of replies) {
                    await ThreadReplyReacts.deleteMany({trid: replies._id})
                }
            }
            await ThreadReplies.deleteMany({category: subCategory._id})

            //Delete related threads
            await Threads.deleteMany({category: subCategory._id})
        }

        await Subcategories.deleteMany({category: name})

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