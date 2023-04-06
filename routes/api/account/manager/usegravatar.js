const router = require('express').Router()
const fetch = require("node-fetch")
const mongoose = require('mongoose')
const md5 = require('md5')

const Accounts = mongoose.model('Accounts')

const {fetchAccount, deleteUploadedProfilePicture} = require('../../../../my_modules/accountapi');

// update account info tab
router.post('/', async (req, res) => {
	let response = {success: false}
	
	try{
		//Only allow logged in users
		if(!req.session.uid) throw "Not logged in"

		//Fetch current email address
		let account = await fetchAccount(req.session.uid, true)

		//Gravatar requires emails be hashed with md5
		let hashedEmail = md5(account.email.toLowerCase())

		//Verify that the gravatar exists
		await fetch(`https://en.gravatar.com/${hashedEmail}.json`)
		.then(res => res.json())
		.then(res => {
			if(res === "User not found") throw "A gravatar does not exist with your account's linked email address"
		})

		//Build gravatar link from account's linked email address
		let newProfilePicture = "https://www.gravatar.com/avatar/" + hashedEmail

		//Delete profile's old uploaded PFP if any
		deleteUploadedProfilePicture(account._id)

		//Update profilepicture with Gravatar link
		await Accounts.updateOne({_id: req.session.uid}, {profilepicture: newProfilePicture})

		response.newProfilePicture = newProfilePicture

		response.success = true
	}
	catch(e){
		response.reason = "Server error"
		if(e.safe && e.safe.length > 0) response.reason = e.safe;
		else if (typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;