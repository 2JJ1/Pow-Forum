const express = require('express');
const router = express.Router()
const mongoose = require('mongoose')

const rolesAPI = require('../../../my_modules/rolesapi')
const buildpfp = require('../../../my_modules/buildpfp')
const accountAPI = require('../../../my_modules/accountapi')
const {EscapeRegex} = require('../../../my_modules/other')

const Accounts = mongoose.model("Accounts")

// 	/profile/search

//getMonth returns number, so use this to get the text
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account
        }

        let filterUsername = req.query.username
        filterUsername && (filterUsername = filterUsername.split("").filter(char => /\w/.test(char)).join(""))

        let filter = {}
        if(filterUsername) filter.username = new RegExp(EscapeRegex(filterUsername), "i")
        let accounts = await Accounts.find(filter).sort({_id: 1}).limit(16).lean()
        for(let account of accounts){
            account.profilepicture = buildpfp(account.profilepicture)
           
            //Shorts join date to eg. Dec 2019
            if(!isNaN(account.creationdate))
                account.creationdate = `${monthNames[account.creationdate.getMonth()].substring(0,3)}, ${account.creationdate.getFullYear()}`
            else account.creationdate = "???"

            //For role color
            account.highestRole = await rolesAPI.GetHighestRole(account.roles)

            //Sum of reputation
            account.reputation = await accountAPI.SumReputation(account._id)
        }

        pagedata.loadMore = accounts.length > 15
        pagedata.accounts = accounts.slice(0,15) //Keeps the user count at 15
        pagedata.username = filterUsername

        res.render('pages/profile/search', pagedata)
    }
    catch(e){
        if(typeof e === "string") res.status(400).render("400", {reason: e})
        else next(e)
    }
});

module.exports = router;