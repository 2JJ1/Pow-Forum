const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const accountAPI = require('../../../my_modules/accountapi')

const Accounts = mongoose.model("Accounts")
const AltAccounts = mongoose.model("AltAccounts")

// 	/profile/alts

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account
        }

        let queryFor = req.query.uid || req.session.uid
        if(!/\d+/.test(queryFor)) throw "Invalid user ID"
        
        // Retrieve main account data
        pagedata.profileInfo = await accountAPI.fetchAccount(queryFor)
        if(!pagedata.profileInfo) throw "Account doesn't exist"

        let doc = await AltAccounts.findById(queryFor)
        let matches = doc ? doc.matches : {}

        for(let uid in matches){
            //Handles past bug where alt tracker tracked the target account
            if(uid === queryFor) {
                delete matches[uid]
                continue
            } 
            let acc = await Accounts.findById(uid)
            matches[uid].username = acc ? acc.username : "[Account Deleted]"
        }

        pagedata.matches = matches
        
        if(!pagedata.accInfo) res.redirect('/login')
        else res.render('pages/profile/alts', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;