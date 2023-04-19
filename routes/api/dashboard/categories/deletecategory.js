const router = require('express').Router()
const mongoose = require("mongoose")

const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

const buildErrorMessage = require("../../../../my_modules/errorMessages")

const accountAPI = require('../../../../my_modules/accountapi')

// 	/api/dashboard/categories

router.delete("/deletecategory", async (req, res, next) => {
	try {
        const { name, password } = req.body
        if(!name || !password) return res.status(400).json({ success: false, error: buildErrorMessage("missingRequiredFields", "name or password") })

        // Validate password
        if(!await accountAPI.CheckPassword(req.session.uid, password)) {
            return res.status(400).json({ success: false, error: buildErrorMessage("specificFieldInvalid", "password") })
        }

        await Promise.all([
            Categories.deleteOne({name}),
            Subcategories.deleteMany({category: name})
        ])

        const subCategoryIds = await Subcategories.find({category: name}).distinct('_id')
        await Promise.all([
            Threads.deleteMany({category: { $in: subCategoryIds } }),
            ThreadReplies.deleteMany({category: { $in: subCategoryIds } })
        ])

		res.json({ success: true })

        // Log audit
		await new ForumAuditLogs({
            time: Date.now(),
            type: "Delete category",
            byUID: req.session.uid,
            content: { category: name },
        }).save()

	} catch(e) {
		next(e)
	}
})

module.exports = router