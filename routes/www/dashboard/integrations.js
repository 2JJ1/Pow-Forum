const router = require("express").Router()
const mongoose = require("mongoose")
const fs = require('fs')

const ForumSettings = mongoose.model("ForumSettings")

// /admin

router.get("/", async (req, res) => {
    let pagedata = {
		powForum: req.powForum,
        accInfo: req.account,
    }

    res.render("pages/dashboard/integrations", pagedata)
})

module.exports = router