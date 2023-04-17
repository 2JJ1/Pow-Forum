const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const path = require("path")
const fs = require("fs")

const buildpfp = require('./buildpfp')
const other = require('./other')
const rolesAPI = require('./rolesapi')

const Accounts = mongoose.model("Accounts")
const TFAs = mongoose.model("TFAs")
const Reputations = mongoose.model("Reputations")

exports.GetUsername = async function(userid){
	let account = await Accounts.findById(userid)
	return account ? account.username : "[DeletedUser]"
}

exports.GetPFP = async function(userid){
	let account = await Accounts.findById(userid)
	return account ? buildpfp(account.profilepicture) : "anovatar.png"
}

exports.is2FAEnabled = async function(userid){
	let doc = await TFAs.findById(userid)
	return doc ? doc.verified : false
}

/**
 * Checks if the account's email address is verified
 * @param {Number} uid The accounts user id; db.accounts._id
 * @returns True if verified, false otherwise
 */
exports.emailVerified = async function(uid){
	let account = await Accounts.findById(uid, {emailVerificationToken: 1})
	return !("emailVerification" in account)
}

/**
 * Checks if the password is correct
 * @param {Number} uid User id of the account
 * @param {String} plainTextPassword Plain text password
 * @returns {Boolean} true if password is correct, otherwise false
 */
exports.CheckPassword = async function(uid, plainTextPassword){
	//Hashed password
	let {password} = await Accounts.findById(uid)
	return (await bcrypt.compare(plainTextPassword, password)) ? true : false
}

/**
 * Grabs all reputation documents and sums their diff
 * @param {*} uid 
 * @returns Their total reputation
 */
exports.SumReputation = async function(uid){
	let reputations = await Reputations.find({for: uid})
	var sum = 0
	for (let reputation of reputations){
		sum += reputation.diff
	}
	return sum
}

exports.ValidatePassword = function(password){
	let response = ""

	if(password.length < 8) response = "Password must be at least 8 characters long"
	if(!password.match(/[0-9]/g)) response = "Password must contain a number"
	if(!password.match(/[a-z]/g)) response = "Password must contain a letter"
	//The password only contains letters and numbers
	if(password.match(/^[0-9a-zA-Z]+$/i)) response = "Password must contain a special character"

	if(!response) response = true
	return response
}

/**
 * 
 * @param {Number|String} identifier Uid or username 
 * @param {Object} options {fallback}
 * @returns Account as plain object 
 */
exports.fetchAccount = async function(identifier, options){
	options = options || {}

	if("projection" in options){
		//These projections are necessary for the auto build to work
		options.projection.roles = 1
		options.projection.profilepicture = 1
		options.projection.lastonline = 1
		options.projection.medias = 1
	}

	let account
	if(/^\d+$/.test(identifier)) account = await Accounts.findById(identifier, options.projection).lean()
	else if(typeof identifier === "string") account = await Accounts.findOne({username: new RegExp(`^${identifier}$`, 'i')}, options.projection).lean()
	if(!account) {
		if(options.fallback) return {
			_id: 0, 
			username: "[DeletedUser]",
			profilepicture: buildpfp("anovatar.png"),
		}
		return
	}

	if(options.secure){
		delete account.password
		delete account.email
		delete account.stripecustomerid
	}

	if(options.reputation) account.reputation = await exports.SumReputation(account._id)

	account.roles = other.StringToArray(account.roles)
	account.highestRole = await rolesAPI.GetHighestRole(account.roles)
	account.profilepicture = buildpfp(account.profilepicture)
	account.isOnline = (new Date() - new Date(account.lastonline)) < 1000*60*15
	account.medias = other.StringToJSON(account.medias)

	return account
}

exports.deleteUploadedProfilePicture = function(uid){
	Accounts.findById(uid)
	.then(account => {
		let {profilepicture} = account

		//If user has an uploaded PFP, delete it
		if(
			profilepicture && 
			!profilepicture.startsWith("https://") && 
			/\d+\_\d+\.(jpeg|jpg|png|gif|webp)/.test(profilepicture)
		){
			let avatarspath = path.resolve('./public/images/avatars') // relative to server.js
			let profilePicturePath = path.join(avatarspath, profilepicture)
			if(fs.existsSync(profilePicturePath)) fs.unlinkSync(profilePicturePath)
			else console.error(`Failed to delete PFP ${profilePicturePath}`)
		}
	})
}