const router = require("express").Router()
const mongoose = require("mongoose")

// /admin

router.get("/", async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
        }

        res.render("pages/dashboard/integrations", pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router