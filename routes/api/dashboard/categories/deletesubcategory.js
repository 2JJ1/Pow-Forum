const router = require('express').Router()
const mongoose = require("mongoose")

const Subcategories = mongoose.model("Subcategories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

const accountAPI = require('../../../../my_modules/accountapi')

// 	/api/dashboard

router.delete("/deletesubcategory", async (req, res, next) => {
	try{
        let response = {success: false}

        let {id, category, password} = req.body
        if(!category || !password) throw "Invalid request"
        id = parseInt(id)

        //First validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) throw "Incorrect password"

        //Delete the category
        let subcategory = await Subcategories.findById(id)
        subcategory.deleteOne()

        //Delete related threads
        await Threads.deleteMany({category: id})
        await ThreadReplies.deleteMany({category: id})
        //TODO- Delete info related to thread replies(reacts...)
        
		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "Delete category",
            byUID: req.session.uid,
            content: {
                name: subcategory.name,
            },
        })
        .save()
	} 
	catch(e){
		next(e)
	}
})

module.exports = router