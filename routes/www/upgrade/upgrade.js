const express = require('express')
const router = express.Router()

const accountAPI = require('../../../my_modules/accountapi')

// 	/upgrade

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
            stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
        }

        if(!req.session.uid) throw "Only logged in users can view this page"

        pagedata.accInfo.isVerifiedEmail = await accountAPI.emailVerified(req.session.uid)

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