const router = require("express").Router()
const mongoose = require("mongoose")

const CategoryGroups = mongoose.model("CategoryGroups")
const Categories = mongoose.model("Categories")

// /admin

router.get("/", async (req, res) => {
    let pagedata = {
		powForum: req.powForum,
        accInfo: req.account,
        categoryGroups: await CategoryGroups.find(),
        categories: await Categories.find(),
    }

    res.render("pages/dashboard/categories", pagedata)
})

module.exports = router