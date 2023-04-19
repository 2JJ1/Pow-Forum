const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require("escape-html")

const buildErrorMessage = require("../../../../my_modules/errorMessages")

const Categories = mongoose.model("Categories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/cateogories

router.post("/addcategory", async (req, res, next) => {
	try{
        let { name } = req.body

        if (!name || typeof name !== 'string') return res.status(400).json({ success: false, error: buildErrorMessage('missingRequiredFields', 'category') })

        const sanitized = escape(name)
        if (sanitized.length < 3 || sanitized.length > 30) return res.status(400).json({ success: false, error: buildErrorMessage('lengthInvalid', 'category name') })

        const existingCategory = await Categories.findOne({ name: sanitized })
        if (existingCategory) return res.status(400).json({ success: false, error: buildErrorMessage('alreadyExists', 'category') })

        const newCategory = new Categories({ name: sanitized })
        await newCategory.save()

        new ForumAuditLogs({
            time: Date.now(),
            type: 'Add Category',
            by: req.session.uid,
            content: { name: sanitized }
        })
        .save()

        res.json({ success: true })
	} 
	catch(e){
		next(e)
	}
})

module.exports = router