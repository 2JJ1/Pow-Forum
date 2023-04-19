const router = require('express').Router()
const mongoose = require("mongoose")
const escape = require("escape-html")

const buildErrorMessage = require("../../../../my_modules/errorMessages")

const Subcategories = mongoose.model("Subcategories")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")

router.post("/editsubcategory", async (req, res, next) => {
  try {
    let { id, currentName, newName, newDescription, requiredRoles } = req.body

    if (!id || !currentName || !newName || !newDescription) {
      return res.status(400).send({ success: false, error: buildErrorMessage("missingRequiredFields", "subcategory") })
    }

    // Sanitize input
    newName = escape(newName.trim())
    newDescription = escape(newDescription.trim())

    if (newName.length < 3 || newName.length > 30) { 
      return res.status(400).send({ success: false, error: buildErrorMessage("lengthInvalid", "subcategory name") })
    }

    if (newDescription.length < 3 || newDescription.length > 250) {
       return res.status(400).send({ success: false, error: buildErrorMessage("biggerLengthInvalid", "subcategory description") })
    }

    // Fetch category
    const category = await Subcategories.findById(id)

    if (!category) return res.status(400).send({ success: false, error: buildErrorMessage("doesNotExist", "subcategory") })

    // Process update
    if (category.name !== newName) {
      category.name = newName
      
      new ForumAuditLogs({
        time: Date.now(),
        type: "Rename subcategory",
        byUID: req.session.uid,
        content: {
            oldName: currentName,
            newName
        },
      })
      .save()
    }

    if (category.description !== newDescription) {
      category.description = newDescription

        new ForumAuditLogs({
            time: Date.now(),
            type: "Change subcategory description",
            byUID: req.session.uid,
            content: {
                subcategory: category.name,
                description: newDescription,
            },
        })
        .save()
    }

    requiredRoles = requiredRoles.trim()

    if (JSON.stringify(category.requiredRoles) !== JSON.stringify(requiredRoles)) {
        category.requiredRoles = requiredRoles

        if (requiredRoles.length === 0) category.requiredRoles = undefined

        new ForumAuditLogs({
            time: Date.now(),
            type: "Change subcategory required roles",
            byUID: req.session.uid,
            content: {
                id,
                requiredRoles,
            },
        })
        .save()
    }

    await category.save()

    res.json({ success: true })
  } catch (e) {
    next(e)
  }
})

module.exports = router