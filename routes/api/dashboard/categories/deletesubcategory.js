const router = require('express').Router()
const mongoose = require("mongoose")

const Subcategories = mongoose.model("Subcategories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

const buildErrorMessage = require("../../../../my_modules/errorMessages")

const accountAPI = require('../../../../my_modules/accountapi')

// 	/api/dashboard

// doesn't work for some reason, even the old version
router.delete("/deletesubcategory", async (req, res, next) => {
	try{
        console.log(req.body)
        if(!("id" in req.body) || !("password" in req.body)) {
            return res.status(400).json({ success: false, error: buildErrorMessage("missingRequiredFields", "category or password") })
        }
        let {id, password} = req.body
        id = parseInt(id)

        //First validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) {
            return res.status(400).json({ success: false, error: buildErrorMessage("specificFieldInvalid", "password") })
        }

        //Delete the category
        let subcategory = await Subcategories.findById(id)
        subcategory.deleteOne()

        //Delete related threads
        await Threads.deleteMany({category: id})
        await ThreadReplies.deleteMany({category: id})
        
		res.json({ success: true })

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