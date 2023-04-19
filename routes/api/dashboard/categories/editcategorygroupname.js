const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require("escape-html")

const buildErrorMessage = require("../../../../my_modules/errorMessages")

const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard

router.post('/editcategorygroupname', async (req, res, next) => {
    try {
        const { currentName, newName } = req.body;
        if (!currentName || !newName) {
            return res.status(400).send({ success: false, error: buildErrorMessage('missingRequiredFields', 'category group') });
        }

        if (newName.length < 3 || newName.length > 30) { 
            return res.status(400).send({ success: false, error: buildErrorMessage('lengthInvalid', 'category group name') });
        }
        const sanitizedNewName = escape(newName);

        const category = await Categories.findOneAndUpdate({ name: currentName }, { name: sanitizedNewName });
        if (!category) return res.status(400).send({ success: false, error: buildErrorMessage('doesNotExist', 'category group') });

        const subcategories = await Subcategories.find({ category: currentName });
        for (const subcategory of subcategories) {
            subcategory.category = sanitizedNewName;
            await subcategory.save();
        }

        res.json({ success: true });

        new ForumAuditLogs({
            time: Date.now(),
            type: 'Rename category group',
            byUID: req.session.uid,
            content: {
                oldName: currentName,
                newName: sanitizedNewName,
            },
        })
        .save();
    } catch (error) {
        next(error);
    }
});

module.exports = router