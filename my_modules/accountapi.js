const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const path = require("path")
const fs = require("fs")

const buildpfp = require('./buildpfp')
const other = require('./other')
const rolesAPI = require('./rolesapi')
const { isMajorEmailDomain } = require('./email')
const phraseblacklist = require('phrase-blacklist')

const Accounts = mongoose.model("Accounts")
const TFAs = mongoose.model("TFAs")
const Reputations = mongoose.model("Reputations")
const PasswordResetSessions = mongoose.model("PasswordResetSessions")
const Sessions = mongoose.model("Sessions")
const Logs = mongoose.model("Logs")
const LoginHistories = mongoose.model("LoginHistories")
const Messages = mongoose.model("Messages")
const NotificationSettings = mongoose.model("NotificationSettings")
const Notifications = mongoose.model("Notifications")
const AltAccounts = mongoose.model("AltAccounts")
const ActiveUsers = mongoose.model("ActiveUsers")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const PinnedThreads = mongoose.model("PinnedThreads")
const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")

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
	let account = await Accounts.findById(uid, {emailVerification: 1}).lean()
	return !("emailVerification" in account)
}

/**
 * Checks if an account exists with the email address and does not have a pending verification session
 * @param {*} emailAddress 
 */
exports.emailTaken = async function(emailAddress){
	emailAddress = emailAddress.toLowerCase()
	let existingVerifiedEmail = await Accounts.findOne({email: emailAddress, emailVerification: {$exists: 0}})
	return existingVerifiedEmail ? true : false
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

exports.validateEmail = async function(email, options){
	//Validate & sanitze email
	if(!email) throw "Missing email"
	email = email.toLowerCase()
	if(!other.ValidateEmail(email)) throw "Invalid email"
	email = escape(email)
	if(!options.bypassMajorEmail && !isMajorEmailDomain(email)) throw "We only allow email addresses from major email providers, such as Gmail."
	if(await exports.emailTaken(email)) throw "An account already exists with this email" 
}

exports.validateUsername = async function(username){
	if(!username) throw "Missing username"
	if(!(username.length >= 3 && username.length <= 15)) throw "Username must be 3-15 characters in length"

	//No need to escape username because of alphanumeric_ limit
	if(!other.isAlphaNumeric_(username)) throw "Only letters, numbers, and underscore are allowed"

	let isClean = phraseblacklist.isClean(username.toLowerCase())
	if (typeof isClean === "string") throw `Your username contains a banned phrase: ${isClean}`
	
	let existingAccount = await exports.fetchAccount(username)
	if(existingAccount) throw "Username is taken"
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

exports.deleteAccount = async function (uid, keepForumContent) {
	//Starts delete process
	await Accounts.deleteOne({_id: uid})
	await PasswordResetSessions.deleteOne({uid})
	await Sessions.deleteMany({session: new RegExp(`"uid":${uid}[},]`)})
	await Logs.deleteMany({uid})
	await LoginHistories.deleteMany({uid})
	await Messages.deleteMany({$or: [{from: uid}, {to: uid}]})
	await TFAs.deleteOne({_id: uid})
	await NotificationSettings.deleteOne({_id: uid})
	await Notifications.deleteMany({$or: [{senderid: uid}, {recipientid: uid}]})
	await AltAccounts.deleteOne({_id: uid})
	await ActiveUsers.deleteOne({uid})

	if(!keepForumContent){
		let threads = await Threads.find({uid})
		//Deletes replies to their threads
		for (let thread of threads){
			await ThreadReplies.deleteMany({tid: thread._id})
			await PinnedThreads.deleteOne({_id: thread._id})
		}
		//Deletes their threads
		await Threads.deleteMany({uid})
		//Deletes their replies on other threads
		await ThreadReplies.deleteMany({uid})
		await Reputations.deleteMany({$or: [{from: uid}, {for: uid}]})
		await ThreadReplyReacts.deleteMany({uid})
	}
	//Otherwise deletes content that'd be unviewable anyway
	else{
		await Reputations.deleteMany({for: uid})
	}
}

exports.findAlts = async function ({ uid = null, ip = null }, seen = new Set(), results = { uids: new Set(), ips: new Set() }) {
    let uidsToCheck = new Set();
    let ipsToCheck = new Set();

    // Starting from a UID: get its IPs
    if (uid) {
        if (seen.has(`uid:${uid}`)) return results;
        seen.add(`uid:${uid}`);

		//IPs are generally held for at most 7 days
        const ips = await LoginHistories.find({ uid, date: { $gt: new Date(Date.now() - 1000*60*60*24*7) } }).distinct('ip');
        ips.forEach(ip => {
            results.ips.add(ip);
            ipsToCheck.add(ip);
        });
    }

    // Starting from an IP: get its UIDs
    if (ip) {
        if (seen.has(`ip:${ip}`)) return results;
        seen.add(`ip:${ip}`);

        const uids = await LoginHistories.find({ ip }).distinct('uid');
        uids.forEach(uid => {
            results.uids.add(uid);
            uidsToCheck.add(uid);
        });
    }

    // Recursive calls
    for (let ip of ipsToCheck) {
        await this.findAlts({ ip }, seen, results);
    }

    for (let altUid of uidsToCheck) {
        await this.findAlts({ uid: altUid }, seen, results);
    }

    return {
        uids: Array.from(results.uids),
        ips: Array.from(results.ips),
    };
};