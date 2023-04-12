const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')

const accountAPI = require('../../my_modules/accountapi')

const PendingEmailVerifications = mongoose.model("PendingEmailVerifications")

// 	/upgrade

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
        }

        pagedata.accInfo.isVerifiedEmail = !(await PendingEmailVerifications.findOne({_id: req.session.uid}))

        var account = await accountAPI.fetchAccount(req.session.uid)
        pagedata.stripecustomerid = account ? account.stripecustomerid : ""
        
        res.render('pages/upgrade', pagedata)
    }
    catch(e){
        next(e)
    }
})

router.get('/success', async (req, res) => {
    res.send("Thank you for your support! Your benefits will activate shortly.<br><a href=\"/profile\">View Profile</a>");
})

module.exports = router;