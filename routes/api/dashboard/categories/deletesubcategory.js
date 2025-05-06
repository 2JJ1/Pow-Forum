const router = require('express').Router()
const mongoose = require("mongoose")

const Subcategories = mongoose.model("Subcategories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")

const accountAPI = require('../../../../my_modules/accountapi')

// 	/api/dashboard

router.delete("/deletesubcategory", async (req, res, next) => {
	try{
        let response = {success: false}

        let {id, password} = req.body
        if(!id || !password) throw "Invalid request"
        id = parseInt(id)

        //First validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) throw "Incorrect password"

        //Delete the subcategory
        let subcategory = await Subcategories.findOneAndDelete({_id: id})

        //Delete data related to thread replies
        const cursor = Threads.find({category: id}).cursor()
        for await (const thread of cursor) {
            let replies = await ThreadReplies.find({tid: thread._id})
            for (const reply of replies) {
                await ThreadReplyReacts.deleteMany({trid: replies._id})
            }
        }

        //Delete related threads
        await Threads.deleteMany({category: id})
        await ThreadReplies.deleteMany({category: id})
        
		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "Delete subcategory",
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