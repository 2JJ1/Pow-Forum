const router = require("express").Router()
const mongoose = require("mongoose")

const Accounts = mongoose.model("Accounts")

// /admin

router.get("/", async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
        }

        let moderators = await Accounts.find({roles: /moderator/})

        res.render("pages/dashboard/moderators", {...pagedata, moderators})
    }
    catch(e){
        next(e)
    }
})

module.exports = router