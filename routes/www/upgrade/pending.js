const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')

const Accounts = mongoose.model('Accounts')

// /manager/security

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account
        }

        if(!req.session.uid){
            res.status(400).redirect('/login')
            return
        }
        
        res.render('pages/upgrade/pending', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;