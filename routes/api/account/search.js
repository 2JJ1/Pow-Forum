const router = require('express').Router()
const mongoose = require('mongoose')

const buildpfp = require('../../../my_modules/buildpfp')
const rolesAPI = require('../../../my_modules/rolesapi')
const accountAPI = require('../../../my_modules/accountapi')
const {EscapeRegex} = require('../../../my_modules/other')
const monthNames = require('../../../my_modules/month')

const Accounts = mongoose.model('Accounts')

// 	/api/account/search

// Search for accounts
router.get('/', async (req, res, next) => {
	try {
		let response = {success: false}

		let {username, fromuid} = req.query

		if(username){ 
			if(typeof username !== "string") throw "Invalid username"
			if(!/^\w+$/.test(username)) throw "Invalid username"
		}

		if("fromuid" in req.query){
			fromuid = parseInt(fromuid)
			if(isNaN(fromuid)) throw "Invalid user id"
		}

		let filter = {}
		if(username) filter.username = new RegExp(EscapeRegex(username))
		if(fromuid) filter._id = {$gt: fromuid}

        let accounts = await Accounts.find(filter).sort({_id: 1}).limit(16).lean()
        for(let account of accounts){
            account.profilepicture = buildpfp(account.profilepicture)
           
            //Shorts join date to eg. Dec 2019
            account.creationdate = new Date(account.creationdate)
            if(!isNaN(account.creationdate))
                account.creationdate = `${monthNames[account.creationdate.getMonth()].slice(0,3)}, ${account.creationdate.getFullYear()}`
            else account.creationdate = "???"

			//For role color
            account.highestRole = await rolesAPI.GetHighestRole(account.roles)

            //Sum of reputation
            account.reputation = await accountAPI.SumReputation(account._id)

			delete account.email
			delete account.password
			delete account.stripecustomerid
        }

        response.loadMore = accounts.length > 15
        response.accounts = accounts.slice(0,15) //Keeps the user count at 15

		//No exception was thrown, so must've been successful
		response.success = true
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

module.exports = router