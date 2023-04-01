const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const buildpfp = require('../../../my_modules/buildpfp')
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

        var queryFor = req.query.uid || req.session.uid
        if(!/\d+/.test(queryFor)) throw "Invalid user ID"
        
        // Retrieve main account data
        pagedata.profileInfo = await accountAPI.fetchAccount(queryFor)
        if(!pagedata.profileInfo) throw "Account doesn't exist"

        var doc = await AltAccounts.findById(queryFor)
        var matches = doc ? doc.matches : {}

        for(var uid in matches){
            var acc = await Accounts.findById(uid)
            matches[uid].username = acc ? acc.username : "[Account Deleted]"
        }

        pagedata.matches = matches
        
        if(!pagedata.accInfo) res.redirect('/login')
        else res.render('pages/profile/alts', pagedata)
    }
    catch(e){
        if(typeof e === "string") res.status(400).render("400", {reason: e})
        else next(e)
    }
});

module.exports = router;