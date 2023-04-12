const express = require('express');
const router = express.Router()
const mongoose = require("mongoose")

const accountAPI = require('../../../my_modules/accountapi');
const rolesAPI = require('../../../my_modules/rolesapi')
const buildpfp = require('../../../my_modules/buildpfp')

const Accounts = mongoose.model("Accounts")
const Reputations = mongoose.model("Reputations")

// 	/profile/reputation

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account
        }

        var queryFor = req.query.uid || req.session.uid

        pagedata.accInfo.canDiff1 = await rolesAPI.RolesHasPerm(pagedata.accInfo.roles, 'rate')
        if(!pagedata.accInfo.canDiff1) throw "You do not have the rate permission! Upgrade here: <a href=\"/upgrade\">Link</a>"
        pagedata.accInfo.canDiff2 = await rolesAPI.RolesHasPerm(pagedata.accInfo.roles, 'rate2')
        //For people who are banned from negative repping
        pagedata.accInfo.banRepNeg = await rolesAPI.RolesHasRole(pagedata.accInfo.roles, 'banRepNeg')
        //Profile information for the viewed user
        pagedata.profileInfo = await Accounts.findById(queryFor).lean()
        .then(async accRow => {
            if(accRow){
                accRow.profilepicture = buildpfp(accRow.profilepicture)

                accRow.reputation = await accountAPI.SumReputation(queryFor)
                
                return accRow
            } 
            else {
                throw "User doesn't exist"
            }
        })

        pagedata.rating = await Reputations.findOne({for: queryFor, from: req.session.uid})
        .then(res => res || {diff: 0, _comment: ""})

        if(!pagedata.accInfo) res.redirect('/login')
        else res.render('pages/profile/rate', pagedata);
    }
    catch(e){
        next(e)
    }
})

module.exports = router;