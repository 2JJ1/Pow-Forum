const express = require('express');
const router = express.Router()
const mongoose = require("mongoose")

const PasswordResetSessions = mongoose.model("PasswordResetSessions")

// 	/passreset

router.get('/', async (req, res) => {
	let pagedata = {
		powForum: req.powForum,
		accInfo: req.account,
		token: req.query.token
	}

	//Checks if theres any issue first
    var tokenErr = await PasswordResetSessions.findById(req.query.token)
	.then(async result => {
		if(result){
			let currentDate = new Date().getTime();
			let expireDate = result.expiredate.getTime()
				
			if(currentDate > expireDate){
				await tokenErr.remove()
				return 'Expired token'
			}
		} 
		else return 'Invalid token'
    })
	
	//Displays error if any
	if(typeof tokenErr === 'string') return res.status(400).render("400", {reason: tokenErr})
	//Displays the password reset page
    else res.render('pages/passreset', pagedata)
});

module.exports = router;