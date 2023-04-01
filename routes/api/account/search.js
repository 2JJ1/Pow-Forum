const router = require('express').Router()
const mongoose = require('mongoose')

const buildpfp = require('../../../my_modules/buildpfp')
const rolesAPI = require('../../../my_modules/rolesapi')
const accountAPI = require('../../../my_modules/accountapi')
const {EscapeRegex} = require('../../../my_modules/other')

const Accounts = mongoose.model('Accounts')

// 	/api/account/search

//getMonth returns number, so use this to get the text
const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Search for accounts
router.get('/', async (req, res) => {
	let response = {success: false}

	try {
		let filterUsername = req.query.username
		if(filterUsername){ 
			if(typeof filterUsername !== "string") throw "Invalid username"
			if(!/^\w+$/.test(filterUsername)) throw "Invalid username"
		}

		let filter = {}
		if(filterUsername) filter.username = new RegExp(EscapeRegex(filterUsername))
		if(req.query.fromuid) filter._id = {$gt: req.query.fromuid}

        let accounts = await Accounts.find(filter).sort({_id: 1}).limit(16).lean()
        for(let account of accounts){
            account.profilepicture = buildpfp(account.profilepicture)
           
            //Shorts join date to eg. Dec 2019
            account.creationdate = new Date(account.creationdate)
            if(!isNaN(account.creationdate))
                account.creationdate = `${monthNames[account.creationdate.getMonth()].substr(0,3)}, ${account.creationdate.getFullYear()}`
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
	}
	catch(e){
		response.reason = "Server error"
		if(typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;