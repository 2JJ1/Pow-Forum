const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const mongoose = require("mongoose")

const recaptcha = require('../../../my_modules/captcha');
const tfa = require('../../../my_modules/2fa')
const accountAPI = require('../../../my_modules/accountapi')
const pfAPI = require('../../../my_modules/pfapi')

const TFAs = mongoose.model("TFAs")

// 	/api/account/login

// parse application/json
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json({limit: '5mb'}))

router.options('/')
router.post('/', async (req, res) => {
	let response = {success: false}
	try{
		//Check if user is already logged in.
		if(req.session.uid) throw "Already logged in";

		//Must complete google captcha first
		if(!await recaptcha.captchaV2(req.body['g-recaptcha-response'], (req.headers['x-forwarded-for'] || req.connection.remoteAddress))) 
			throw "Captcha failed"
		
		//Will need both username and password obviously
		var username = req.body.username
		var password = req.body.password
		if(!username || !password){
			throw {safe: 'Missing username or password'}
		}
				
		//Fetch account information
		var accData = await accountAPI.fetchAccount(username)

		//Check if an account exists with this username
		if(!accData) throw "This account does not exist"

		//If password field is null, then a password reset was forced
		if(!accData.password) throw "Password reset request required"
		
		//Checks if password is correct
		if(!await accountAPI.CheckPassword(accData._id, password)) throw "Invalid login credentials"

		//Handles 2FA check
		await TFAs.findById(accData._id)
		.then(async result => {
			if(result) {
				//2FA is enabled
				if(result.verified === 1) {
					//2FA is verified, so a code is required to login
					if(!req.body.token2fa) throw "Invalid login credentials"

					var verified = await tfa.verify(accData._id, req.body.token2fa)
					if(!verified) throw "Invalid login credentials"
				}
			}
		})

		//sets session
		req.session.uid = accData._id

		//Logs their login
		await pfAPI.TrackLogin(accData._id, (req.headers['x-forwarded-for'] || req.connection.remoteAddress))
						
		//Compile response
		response.success = true
	} 
	catch(e){
		response.reason = "Server error"
		if(e.safe && e.safe.length > 0) response.reason = e.safe;
		else if(typeof e === "string") response.reason = e
		else console.warn(e)
	}

	res.json(response)
});

module.exports = router;