const express = require('express')
const router = express.Router()

const accountapi = require('../../../my_modules/accountapi')

// /manager/security

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account
        }

        if(!req.session.uid) return res.status(400).redirect('/login');
        
        pagedata.accInfo.tfaEnabled = await accountapi.is2FAEnabled(req.session.uid)

        pagedata.pendingEmailVerification = !await accountapi.emailVerified(req.session.uid)
        
        res.render('pages/manager/security', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;