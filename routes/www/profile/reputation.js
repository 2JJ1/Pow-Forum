const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const rolesAPI = require('../../../my_modules/rolesapi')
const buildpfp = require('../../../my_modules/buildpfp');
const accountAPI = require('../../../my_modules/accountapi');

const Accounts = mongoose.model("Accounts")
const Reputations = mongoose.model("Reputations")

// 	/profile/reputation

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account,
            isMod: await rolesAPI.isModerator(req.session.uid),
        }

        var queryFor = req.query.uid || req.session.uid

        pagedata.profileInfo = await accountAPI.fetchAccount(queryFor)
        .then(async account => {
            if(account){
                //Sum of reputation
                account.reputation = await accountAPI.SumReputation(queryFor)
                return account
            } 
            else throw "User doesn't exist"
        })

        pagedata.repcards = await Reputations.find({for: queryFor}).lean()
        .then(async result => {
            for (let repRow of result){
                //Get username
                repRow.username = await accountAPI.GetUsername(repRow.from)

                //Get their reputation sum
                repRow.reputation = await accountAPI.SumReputation(repRow.from)

                //Format the date
                var date = new Date(repRow.date)
                repRow.date = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`

                //Check if can be deleted by the viewer
                repRow.canDelete = await rolesAPI.isClientOverpowerTarget(req.session.uid, repRow.from)
            }
            return result
        })

        if(!pagedata.accInfo) res.redirect('/login')
        else res.render('pages/profile/reputation', pagedata);
    }
    catch(e){
        if(typeof e === "string") res.status(400).render("400", {reason: e})
        else next(e)
    }
});

module.exports = router;