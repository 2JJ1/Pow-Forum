const router = require('express').Router()
var escape = require('escape-html')
const crypto = require('crypto')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const other = require('../../../../my_modules/other')
const { SendBasicEmail, isMajorEmailDomain } = require('../../../../my_modules/email')
const tfa = require('../../../../my_modules/2fa')
const accountAPI = require('../../../../my_modules/accountapi')

const ForumSettings = mongoose.model("ForumSettings")
const Logs = mongoose.model("Logs")
const Accounts = mongoose.model("Accounts")
const TFAs = mongoose.model("TFAs")

// /v1/account/manager

//update account security tab
router.post('/', async (req, res, next) => {
	try{
		let response = {success: false}

		//Only allow logged in users
		if(!req.session.uid) throw "Not logged in"

		var accData = await accountAPI.fetchAccount(req.session.uid)
		
		//Must enter password to change any security info
		var curPassword = req.body.currentpassword
		if(!req.body.currentpassword) throw "Missing current password"
		if(!await accountAPI.CheckPassword(req.session.uid, curPassword)) throw "Incorrect current password"
		
		//Contains all data to update in database
		let keyvalues = {}

		//Sets new password
		if(req.body.newpassword){
			var newPassword = req.body.newpassword

			let validatedPassword = accountAPI.ValidatePassword(newPassword)
			if(validatedPassword !== true) throw validatedPassword
			
			newPassword = await bcrypt.hash(newPassword, 10)
			
			//No need to sanitize password. It can be what ever they want!
			//No need to escape since their password wouldn't be displayed as html anywhere
			keyvalues.password = newPassword
		}
		
		//Sets new email
		if(req.body.hasOwnProperty('email') && req.body.email !== accData.email){
			let email = escape(req.body.email)
			email = other.sanitizeGmail(email) //Sanitize gmail addresses to prevent the dot or + method of spam

			//Rate limit email changes to once/day to prevent mailgun over charges
			await Logs.findOne({uid: req.session.uid, action: "update_email", date: {$gte: new Date() - 1000*60*60*24}})
			.then(doc => {
				if(doc) throw "You must wait 24 hours since your last email change request."
			})

			//Checks that an account is not already verified with this email
			if(await accountAPI.emailTaken(email)) throw "An account already exists with this email" 

			if(!other.ValidateEmail(email)) throw "Invalid email"
			if(!isMajorEmailDomain(email)) throw "We only allow email addresses from major email providers, such as Gmail."
			
			// Create email verification session
			//Creates verification token
			let hash = crypto.randomBytes(64).toString('hex');

			keyvalues.emailVerification = {
				token: hash,
				lastSent: new Date()
			}

			//Send verification email
			let emailBody = 'Hello,\n\n' +
			`${accData.username}(ID:${req.session.uid}) at ${process.env.FORUM_URL} wants to use your email as the account holder. To verify this email address, please visit the link below. In doing so, you remove restriction from services such as posting to the forum and enable higher account security.\n\n` +
			`${process.env.FORUM_URL}/verify?token=${hash}\n\n` + 
			`This message was generated by ${process.env.FORUM_URL}.`
			
			await SendBasicEmail(email, `${(await ForumSettings.findOne({type: "name"})).value} Email Verification`, emailBody)

			//Log the email change request so we can rate limit to 1 email change request/day. This is rate limited so I don't get over charged by mailgun api
			await new Logs({
				uid: req.session.uid,
				action: "update_email",
				description: email, //Changed to this email
				date: new Date() //Current date
			}).save()

			keyvalues.email = email
		}

		if(!(Object.keys(keyvalues).length > 0)) throw "No changes requested..."

		//Updates account
		await Accounts.updateOne({_id: req.session.uid}, keyvalues)
		
		response.success = true
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

//Enable 2FA
router.post('/enable2fa', async (req, res, next) => {
	try{
		let response = {success: false}

		//Only allow logged in users
		if(!req.session.uid) throw "Not logged in";

		response.qrcode = await tfa.enable(req.session.uid)
		response.success = true
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

//Verify 2FA
//Enables account 2FA if they send the correct 2FA auth code
router.post('/verify2fa', async (req, res, next) => {
	try{
		let response = {success: false}

		//Only allow logged in users
		if(!req.session.uid) throw "Not logged in";

		//A token must be sent & sanitized
		if(!req.body.token) throw "Missing token";

		var verified = await tfa.verify(req.session.uid, req.body.token)
		if(verified)  await TFAs.updateOne({_id: req.session.uid}, {verified: 1})
		else throw "Incorrect code"
		
		response.success = true
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

//Disable 2fa
router.post('/disable2fa', async (req, res, next) => {
	try{
		let response = {success: false}

		//Only allow logged in users
		if(!req.session.uid) throw "Not logged in";

		//A token must be sent & sanitized
		if(!req.body.token) throw "Missing token";

		var verified = await tfa.verify(req.session.uid, req.body.token)
		if(!verified) throw "Incorrect code"

		await TFAs.deleteOne({_id: req.session.uid})

		response.success = true
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

module.exports = router;