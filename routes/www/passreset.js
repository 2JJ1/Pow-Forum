const express = require('express');
const router = express.Router()
const mongoose = require("mongoose")

const PasswordResetSessions = mongoose.model("PasswordResetSessions")

// 	/passreset

router.get('/', async (req, res, next) => {
	let pagedata = {
		powForum: req.powForum,
		accInfo: req.account,
		token: req.query.token
	}

	//Fetch the reset session assigned to this token
    let resetSession = await PasswordResetSessions.findOne({token: req.query.token})

	//Checks if a password reset session exists with this token
	if(!resetSession) return next('Invalid token. This reset session does not exist. It may have expired or been used already.')

	//Check if the reset session is expired
	let currentDate = new Date().getTime()
	let expireDate = resetSession.expireDate.getTime()
	if(currentDate > expireDate){
		await resetSession.remove()
		return next('This token is expired. Please send a new password reset request.')
	}
	
	//Displays the password reset page
    else res.render('pages/passreset', pagedata)
});

module.exports = router;