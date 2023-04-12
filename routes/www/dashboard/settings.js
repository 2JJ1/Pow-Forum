const router = require("express").Router()
const mongoose = require("mongoose")

const ForumSettings = mongoose.model("ForumSettings")

// /dashboard

router.get("/", async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
        }

        let name = (await ForumSettings.findOne({type: "name"})).value

        let description = (await ForumSettings.findOne({type: "description"})).value

        res.render("pages/dashboard/settings", {...pagedata, name, description})
    }
    catch(e){
        next(e)
    }
})

module.exports = router