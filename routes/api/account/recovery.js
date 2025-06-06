const router = require('express').Router()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const recaptcha = require('../../../my_modules/captcha')
const mailgun = require('../../../my_modules/email')
const accountAPI = require('../../../my_modules/accountapi')

const ForumSettings = mongoose.model("ForumSettings")
const Accounts = mongoose.model("Accounts")
const PasswordResetSessions = mongoose.model("PasswordResetSessions")

// 	/v1/account/recovery

// parse application/json
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json({limit: '5mb'}))

// Request password reset session or username recovery
router.post('/', async (req, res, next) => {
	try {
		let response = {success: false}

		if(!await recaptcha.captcha(req.body.grecaptcharesponse, req.ip))
			throw "Captcha failed"

		let forumTitle = (await ForumSettings.findOne({type: "name"})).value
		
		//Password reset request
		//Only valid for 15 minutes
		if('username' in req.body && req.body.username.length > 0){
			//Password reset request
			let accountdata = await accountAPI.fetchAccount(req.body.username)
			if(!accountdata) throw 'No account with that username'

			//Don't create/refresh reset session if one was made in the past 5 minutes
			let resetSession = await PasswordResetSessions.findOne({
				_id: accountdata._id, 
				expireDate: {
					$gt: new Date(new Date().getTime() + 1000 * 60 * 10)
				}
			})
			if(resetSession) throw "A password reset session already exists. Please check your email inbox, including the spam folder."

			let token = crypto.randomBytes(64).toString('hex')
			//Generates new token per the extremely rare chance it exists
			do{
				token = crypto.randomBytes(64).toString('hex')
			} while(await PasswordResetSessions.findOne({token}))

			//Set expires after 15 minutes
			let expireDate = new Date();
			expireDate.setMinutes(expireDate.getMinutes()+15);

			// Sends reset session email
			await mailgun.SendMail({
				from: `"noreply" noreply@${process.env.MAILGUN_DOMAIN}`, // sender address
				to: accountdata.email, // list of receivers
				subject: `${forumTitle} | Password Reset Request`, // Subject line
				text: `Someone has requested to reset ${accountdata.username}(id: ${accountdata._id})'s on ${process.env.FORUM_URL}` + 
				'\r\n\r\nIf this was you, please go to the following link, otherwise ignore and delete this email.' +
				'\r\nThe link is valid for 15 minutes.\r\n\r\n' +
				`${process.env.FORUM_URL}/passreset/?token=${token}` +
				'\r\n\r\n' +
				`This message was generated by ${process.env.FORUM_URL}`
			})

			//Creates reset session
			//Only create session if the email above was sent
			await PasswordResetSessions.findOneAndUpdate({_id: accountdata._id}, {token, expireDate}, {upsert: true})
			
			//No errors? Report success
			response.success = true
		}
		//Username recovery
		else if('email' in req.body && req.body.email.length > 0){
			//Username retrieval request
			let usernames = await Accounts.find({email: new RegExp(`^${req.body.email}$`, 'i')})
			.then(async result => {
				if(result.length > 0){
					let usernames = ""
					for(index in result){
						usernames += result[index].username + ", "
					}
					usernames = usernames.substr(0, usernames.length - 2) //Remove extra ", "
					return usernames
				} 
				else throw "No account with that email"
			})

			let emaildata = {
				from: `"noreply" noreply@${process.env.MAILGUN_DOMAIN}`, // sender address
				to: req.body.email, // list of receivers
				subject: `${forumTitle} | Username Recovery Request`, // Subject line
				text: `You have requested a reminder of ${forumTitle} accounts associated with this email address. Your accounts are listed below:` +
				'\r\n\r\n' +
				usernames + 
				'\r\n\r\n' +
				`This message was generated by ${process.env.FORUM_URL}`
			};

			await mailgun.SendMail(emaildata)
			
			response.success = true
		}

		res.json(response)
	} catch(e){
		next(e)
	}
})

// Reset password
router.post('/passreset', async (req, res, next) => {
	try {
		let response = {success: false}

		let { token, password } = req.body

		if(!token) throw 'Missing token'
		
		if(!password) throw 'Missing password'

		// Validate reset session
		//Fetch session
		let resetSession = await PasswordResetSessions.findOne({token})
		if(!resetSession) throw "Invalid token. This reset session does not exist."

		//Check expired
		let currentDate = new Date().getTime();
		let expireDate = resetSession.expireDate.getTime()
		if(currentDate > expireDate){
			await PasswordResetSessions.deleteOne({token})
			throw "Expired token"
		}
		
		//Who this session belongs to
		let uid = resetSession._id
		
		//Validate and hash new password
		let validatePassword = accountAPI.ValidatePassword(password)
		if(validatePassword !== true) throw validatePassword
		let securePassword = await bcrypt.hash(password, 10)

		//Fetch account
		let account = await Accounts.findById(uid)
		if(!account) {
			await resetSession.deleteOne()
			throw "An account does not exist for this password reset session"
		}
		
		//Update password
		account.password = securePassword
		await account.save()
		
		//Delete token so can't reset with it anymore
		await resetSession.deleteOne()
		
		//No early exit, so report success
		response.success = true
		res.json(response)

		// Send password has reset notice
		let forumTitle = (await ForumSettings.findOne({type: "name"})).value
		
		await mailgun.SendMail({
			from: `"noreply" noreply@${process.env.MAILGUN_DOMAIN}`, // sender address
			to: account.email, // list of receivers
			subject: `${forumTitle} | Password Reset Confirmation`, // Subject line
			text: `The password for ${account.username}(id: ${account._id})'s on ${process.env.FORUM_URL} has been reset through the password recovery form.` + 
			'\r\n\r\nIf this was not you, you may have been hacked. You may recover your account by sending a new password reset request at the link below. Be sure your email and PC are secured.' +
			`${process.env.FORUM_URL}/recovery` +
			'\r\n\r\n' +
			`This message was generated by ${process.env.FORUM_URL}`
		})
	} 
	catch(e){
		next(e)
	}
})

module.exports = router;