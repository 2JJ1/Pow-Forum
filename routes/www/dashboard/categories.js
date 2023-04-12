const router = require("express").Router()
const mongoose = require("mongoose")

const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")

// /admin

router.get("/", async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
            categories: await Categories.find(),
            subCategories: await Subcategories.find(),
        }

        res.render("pages/dashboard/categories", pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router