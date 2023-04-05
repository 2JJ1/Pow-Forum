require('dotenv').config()
var readlineSync = require('readline-sync');
const mongoose = require("mongoose")
const fs = require('fs') 
const envfile = require('envfile')
const argv = require('minimist')(process.argv.slice(2))

const other = require('./my_modules/other')
const updateEnv = require('./my_modules/updateenv')

async function handleCommand(command){
	try {
		if(command in commands){
			await commands[command].func()
		} else{
			console.log("Invalid command... Choose from below")
			DisplayCommandsList();
		}
	}
	catch(e){
		if(typeof e === "string") console.error(e)
		else throw e
	}

	console.log("\n______complete______\n")
}

//Connects to MongoDB database
mongoose.set('strictQuery', false)
mongoose.connect(`mongodb://127.0.0.1:27017/${process.env.DATABASE_NAME || "PFForum"}`)
.then(async ()=> {
	//Handle command through process options
	if(argv.c) {
		await handleCommand(argv.c)
		process.exit(0)
	}

	//Handle commands through CLI
	console.log("Welcome to Pow Forum's admin panel")
	console.log("Say 'help' for list of commands\n")
	while (true){
		if(!process.env.SUPPORT_EMAIL_ADDRESS || !process.env.FORUM_URL || !process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_APIKEY || !process.env.MAILGUN_NOREPLY_ADDRESS) {
			console.warn("Setup must be completed before you can use any other command...\n")
			commands.setup.func()
		}
		else {
			let command = readlineSync.question('Enter command: \n> ');
			await handleCommand(command)
		}
	}
})
require('./models')

const Accounts = mongoose.model("Accounts")
const Reputations = mongoose.model("Reputations")
const Messages = mongoose.model("Messages")
const PasswordResetSessions = mongoose.model("PasswordResetSessions")
const PendingEmailVerifications = mongoose.model("PendingEmailVerifications")
const Sessions = mongoose.model("Sessions")
const Logs = mongoose.model("Logs")
const LoginHistories = mongoose.model("LoginHistories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")
const TFAs = mongoose.model("TFAs")
const PinnedThreads = mongoose.model("PinnedThreads")
const NotificationSettings = mongoose.model("NotificationSettings")
const Notifications = mongoose.model("Notifications")
const AltAccounts = mongoose.model("AltAccounts")
const ActiveUsers = mongoose.model("ActiveUsers")

const commands = {
	//Preset commands. Other commands are added dynamically
	help: {func: function(){DisplayCommandsList(false)}, desc: "Displays a list of commands along with description"},
	".help": {func: DisplayCommandsList, desc: "Displays compact list of commands"},
}

function DisplayCommandsList(compact=true){
	//since commands' keys are just commands, store in the form of array here
	let commandsListArray = Object.keys(commands)
	
	//Give list of commands without description
	if(compact){
		let response = ""
		for (index in commandsListArray){
			let command = commandsListArray[index]
			response += command + ", "
		}
		response = response.substring(0, response.length - 2) //hacky way to remove extra ", "
		console.log(response)
	} else{
		for (index in commandsListArray){
			let command = commandsListArray[index]
			console.log(`* ${command} : ${commands[command].desc}`)
		}
	}
}

commands.setup = {
	desc: "Change this Pow Forum's installation",
	func: async () => {
		if(!fs.existsSync('.env')) fs.writeFileSync('.env', '')

		let parsedEnv = envfile.parse(fs.readFileSync('./.env', "utf8"))

		//Configures COOKIE_DOMAIN and FORUM_URL
		console.log("What is your website's domain? Ex: https://mywebsite.com")
		console.log("Use 'localhost' if testing without HTTP proxy")
		if(parsedEnv.FORUM_URL) console.log(`Found existing setting, ${parsedEnv.FORUM_URL}. Leave input empty to skip.`)
		let parsedURL
		while (!parsedURL){
			let domain = readlineSync.question(`> `, {
				defaultInput: parsedEnv.FORUM_URL
			})
			if(domain === "localhost") parsedURL = new URL('http://localhost')
			else {
				try {
					parsedURL = new URL(domain)
					parsedURL.topLevelDomain = parsedURL.hostname.split(".").splice(-2).join(".")
				}
				catch(e) {
					console.log("Invalid URL")
				}
			}
		}
		updateEnv({COOKIE_DOMAIN: parsedURL.hostname === 'localhost' ? 'localhost' : `.${parsedURL.topLevelDomain}`})
		updateEnv({FORUM_URL: parsedURL.hostname !== 'localhost' ? parsedURL.origin : `${parsedURL.protocol}//${parsedURL.hostname}:${process.env.PORT || 8087}`})

		//Configures support email address
		console.log("\nWhat is your support email address?")
		if(parsedEnv.SUPPORT_EMAIL_ADDRESS) console.log(`Found existing setting, "${parsedEnv.SUPPORT_EMAIL_ADDRESS}". Leave input empty to skip.`)
		let SUPPORT_EMAIL_ADDRESS
		while(!SUPPORT_EMAIL_ADDRESS){
			SUPPORT_EMAIL_ADDRESS = readlineSync.question(`> `, { defaultInput: parsedEnv.SUPPORT_EMAIL_ADDRESS })

			if(!other.ValidateEmail(SUPPORT_EMAIL_ADDRESS)) {
				console.log("Invalid email address")
				SUPPORT_EMAIL_ADDRESS = false
			}
		}
		updateEnv({SUPPORT_EMAIL_ADDRESS})
		
		//Configures mailgun API
		console.log("\nWe use mailgun to send securely send emails. Create an account with them at https://www.mailgun.com/ and setup your domain.")
		
		console.log("\nWhat is your mailgun domain?")
		if(parsedEnv.MAILGUN_DOMAIN) console.log(`Found existing setting, "${parsedEnv.MAILGUN_DOMAIN}". Leave input empty to skip.`)
		let MAILGUN_DOMAIN
		while(!MAILGUN_DOMAIN){
			MAILGUN_DOMAIN = readlineSync.question(`> `, { defaultInput: parsedEnv.MAILGUN_DOMAIN })

			if(other.extractHostname(MAILGUN_DOMAIN).length < 5) {
				console.log("Invalid domain")
				MAILGUN_DOMAIN = false
			}
		}
		updateEnv({MAILGUN_DOMAIN})

		console.log("\nWhat is your mailgun API key?")
		if(parsedEnv.MAILGUN_APIKEY) console.log(`Found existing setting, "${parsedEnv.MAILGUN_APIKEY}". Leave input empty to skip.`)
		let MAILGUN_APIKEY
		while(!MAILGUN_APIKEY){
			MAILGUN_APIKEY = readlineSync.question(`> `, { defaultInput: parsedEnv.MAILGUN_APIKEY })

			if(!/^[\w-]{10,}$/.test(MAILGUN_APIKEY)) {
				console.log("Invalid domain")
				MAILGUN_APIKEY = false
			}
		}
		updateEnv({MAILGUN_APIKEY})
		
		
		console.log("\nWhat is your preferred noreply email address?")
		if(parsedEnv.MAILGUN_NOREPLY_ADDRESS) console.log(`Found existing setting, "${parsedEnv.MAILGUN_NOREPLY_ADDRESS}". Leave input empty to skip.`)
		let MAILGUN_NOREPLY_ADDRESS
		while(!MAILGUN_NOREPLY_ADDRESS){
			MAILGUN_NOREPLY_ADDRESS = readlineSync.question(`> `, { defaultInput: parsedEnv.MAILGUN_NOREPLY_ADDRESS })

			if(!other.ValidateEmail(MAILGUN_NOREPLY_ADDRESS)) {
				console.log("Invalid email address")
				MAILGUN_NOREPLY_ADDRESS = false
			}
		}
		updateEnv({MAILGUN_NOREPLY_ADDRESS})
		
		console.log("\nInitial setup complete. Restart the forum process if it's running. Please log into an admin account and continue configuration in the dashboard.")
	}
}

async function FetchUser(target){
	let user = {}

	//Assume target is UID (number)
	if(!isNaN(target)) {
		user.uid = target
		user.acc = await Accounts.findById(target).lean()
		if(user.acc) user.username = user.acc.username
		else throw "Could not find an account with that UID"
	}
	//Assume target is username (string)
	else {
		user.username = target
		user.acc = await Accounts.findOne({username: new RegExp(`^${user.username}$`, 'i')}).lean()
		if(user.acc) user.uid = user.acc._id
		else throw "Could not find an account with that username"
	}

	return user
}

commands.addadmin = {
	desc: "Add an admin user",
	func: async () => {
		//Account document selection
		var target = readlineSync.question('Username or UID: ')
		var {acc, uid, username} = await FetchUser(target)

		acc.roles = other.StringToArray(acc.roles)
		if(acc.roles.includes('admin')) throw `${username} is already an admin`

		console.log(`Are you sure you want to add ${username} (UID ${uid}) as an admin? They will be granted abusable powers such as the ability to delete accounts and add categories.`)
		let confirm = readlineSync.question('yes/no: ')
		if(confirm !== "yes") throw "Aborted admin give"

		//Adds the admin role
		acc.roles.push('admin')

		//Updates the account in the database to reflect data
		await Accounts.updateOne({_id: uid}, {roles: JSON.stringify(acc.roles)})

		console.log(`${username} is now an admin`)
	}
}

commands.removeadmin = {
	desc: "Removes an admin user",
	func: async () => {
		//Account document selection
		var target = readlineSync.question('Username or UID: ')
		var {acc, uid, username} = await FetchUser(target);

		acc.roles = other.StringToArray(acc.roles)
		let index = acc.roles.indexOf("admin")
		if(index === -1) return console.log(`${username} is not an admin`)

		//Removes the admin role
		acc.roles.splice(index, 1)

		//Updates the account in the database to reflect data
		await Accounts.updateOne({_id: uid}, {roles: JSON.stringify(acc.roles)})

		console.log(`${username} is no longer an admin`)
	}
}

commands.rateuser = {func: RateUser, desc: "Applies a rating from the bot account"}
async function RateUser(){
	//Get user id to apply rating to
	var username = readlineSync.question('Username: ')
	var uid = await Accounts.findOne({username: new RegExp(`${username}`, 'i')})
	.then(account=>{
		if(account) return account._id
		throw "Could not get uid from username"
	})

	var diff = parseInt(readlineSync.question('Diff: ')) // Must be a number
	var comment = readlineSync.question('Comment: ') // "What do you have to say about this user?"

	//Delete an existing reputation if it exists. The following insert is basically a replacement rating
	await Reputations.deleteOne({for: uid, from: 1})

	//Try posting the rating
	await new Reputations({
		for: uid,
		from: 1,
		diff,
		comment,
		date: new Date(),
	}).save()

	console.log("Finished")
}

//Deletes (any?) data associated with this user
commands.deleteuser = {func: DeleteUser, desc: "Deletes their account and all data linked to their uid"}
async function DeleteUser(){
	//Get user id to apply rating to
	var target = readlineSync.question('Username or UID: ')
	var acc, uid, username;
	if(!isNaN(target)) {
		uid = target
		acc = await Accounts.findById(target)
		if(acc) username = acc.username
		else console.log("Acc not found for that UID, but you may proceed to delete remaining associated data.")
	}
	else {
		username = target
		acc = await Accounts.findOne({username: new RegExp(`^${username}$`, 'i')})
		if(acc) uid = acc._id
		else throw "Could not find an account with that username"
	}

	console.log(`Are you sure you want to delete ${username}(${uid})'s account?`)
	let confirm = readlineSync.question('yes/no: ')
	if(confirm !== "yes"){
		console.log("Aborted account deletion")
		return
	}

	await Accounts.deleteOne({_id: uid})
	await PasswordResetSessions.deleteOne({uid})
	await PendingEmailVerifications.deleteOne({_id: uid})
	await Sessions.deleteMany({session: new RegExp(`"uid":${req.session.uid}[},]`)})
	await Logs.deleteMany({uid})
	await LoginHistories.deleteMany({uid})
	await Messages.deleteMany({$or: [{from: uid}, {to: uid}]})
	await TFAs.deleteOne({_id: uid})
	await NotificationSettings.deleteOne({_id: uid})
	await Notifications.deleteMany({$or: [{senderid: uid}, {recipientid: uid}]})
	await AltAccounts.deleteOne({_id: uid})
	await ActiveUsers.deleteOne({uid})

	console.log("Delete their forum content too? (Threads, replies, reputation)")
	let confirm2 = readlineSync.question('yes/no: ')
	if(confirm2 === "yes"){
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
	else{
		//Only deletes reputation given to them since they'd be unviewable anyways
		await Reputations.deleteMany({for: uid})
	}

	console.log("Finished")
}

//Right now the online user tracker doesnt auto clear. This command will delete documents older than 15 minutes
commands.cleanonlineuserlist = {func: CleanOnlineUsersList, desc: "Deletes activeusers documents older than 15 minutes"}
async function CleanOnlineUsersList(){
	await ActiveUsers.deleteMany({ 
		time: { 
			$lt: Date.now() - (1000*60*15)
		} 
	})
}

//Right now the global chats doesnt auto clean. This command will global chats older than 15 minutes
commands.cleanglobalchat = {func: CleanMessages, desc: "Deletes global chats older than 15 minutes"}
async function CleanMessages(){
	await Messages.deleteMany({ 
		time: { 
			$lt: Date.now() - (1000*60*15)
		} 
	})
}

//Right now the global chats doesnt auto clean. This command will global chats older than 15 minutes
commands.fixunicode = {
	desc: "Goes through text content and fixes unicode errors",
	func: async() => {
		/* Conversions
			â€™ > '
			Â, > delete
			Â > delete
		*/
		{
			let threadIds = (await Threads.find({title: /(â€™|Â)/}, {_id: 1})).map(thread => thread._id)
			for (let threadId of threadIds) {
				let thread = await Threads.findById(threadId)
				thread.title = thread.title.replace(/â€™/g, "'")
				thread.title = thread.title.replace(/Â,?/g, "")
				await thread.save()
			}

			let threadReplyIds = (await ThreadReplies.find({content: /(â€™|Â)/}, {_id: 1})).map(thread => thread._id)
			for (let threadReplyId of threadReplyIds) {
				let threadReply = await ThreadReplies.findById(threadReplyId)
				threadReply.content = threadReply.content.replace(/â€™/g, "'")
				threadReply.content = threadReply.content.replace(/Â,?/g, "")
				await threadReply.save()
			}
		}
	}
}

/*
commands.purgeaccounts = {func: PurgeAccounts, desc: "Deletes account older than 6 months with no valuable history"}
async function PurgeAccounts(){
	//Loop through all accounts. Must paginate to preserve memory space
	let numAccount = (await mysql.query("SELECT COUNT(*) FROM accounts WHERE creationdate < NOW() - INTERVAL 6 MONTH"))[0]["COUNT(*)"]
	let pageCount = 1000
	let pages = Math.floor(numAccount/pageCount)+1
	let deleteCount = 0
	console.log(`Scanning through ${numAccount} accounts`)
	for(var i=0; i<pages; i++){
		let page = await mysql.query("SELECT * FROM accounts WHERE creationdate < NOW() - INTERVAL 6 MONTH ORDER BY uid LIMIT ?,?", [i*pageCount, pageCount])
		for(var v=0; v<page.length; v++){
			//console.log(`Scanning ${page[v].username}#${page[v].uid}'s account`)

			//Look for forum thread activity 
			let numReplies = (await mysql.query("SELECT COUNT(*) FROM thread_replies WHERE uid=?", page[v].uid))[0]["COUNT(*)"]
			if(numReplies > 0) continue

			//Check if they have a public reputation
			let hasRep = (await mysql.query("SELECT COUNT(*) FROM reputation WHERE _for=?", page[v].uid))[0]["COUNT(*)"] > 0
			if(hasRep) continue

			//Check if they've sent messages
			let hasMessages = await Messages.exists({$or: [{from: page[v].uid}, {to: page[v].uid}]})
			if(hasMessages) {
				console.log(`Skipped ${page[v].username}: Had messages`)
				continue
			}

			//Check if they own an exploit on the front page. They're valuable outside the forum
			let isExploitOwner = (await mysql.query("SELECT COUNT(*) FROM download_links WHERE uid=?", page[v].uid))[0]["COUNT(*)"] > 0
			if(isExploitOwner) {
				console.log(`Skipped ${page[v].username}: Owns an exploit`)
				continue
			}

			//No valuable content found for this account. Delete them
			deleteCount++
			await mysql.query("DELETE FROM accounts WHERE uid=?", [page[v].uid])
			await mysql.query("DELETE FROM password_reset_sessions WHERE uid=?", [page[v].uid])
			await mysql.query("DELETE FROM pending_email_verifications WHERE uid=?", [page[v].uid])
			await mysql.query(`DELETE FROM sessions WHERE session LIKE '%"uid":${page[v].uid}}' OR session LIKE '%"uid":"${page[v].uid}"%'`)
			await mysql.query("DELETE FROM logs WHERE uid=?", [page[v].uid])
			await mysql.query("DELETE FROM loginhistory WHERE uid=?", [page[v].uid])
			await mysql.query("DELETE FROM threads WHERE uid=?", [page[v].uid]) //Just in case of a bug elsewhere
			await mysql.query("DELETE FROM reputation WHERE _from=? OR _for=?", [page[v].uid, page[v].uid])
			console.log(`Deleted ${page[v].username}#${page[v].uid}'s account`)
		}
	}
	console.log(`Deleted ${deleteCount} accounts`)
}
*/


commands.listNonexistentThreadsWithReplies = {
	func: ListNonexistentThreadsWithReplies,
	desc: "Lists non-existent threads with replies"
}
async function ListNonexistentThreadsWithReplies(){
	let replies = await ThreadReplies.find().sort({_id: 1}).lean()
	console.log(`Looking through ${replies.length} replies`)

	var nonexistentThreads = []
	for(let reply of replies){
		if(nonexistentThreads.includes(reply.tid)) continue
		let thread = await Threads.findById(reply.tid)
		if(!thread) {
			nonexistentThreads.push(reply.tid)
			console.log(`tid:${reply.tid} does not exist for existing trid:${reply._id}`)
		}
	}
	console.log(`Found ${nonexistentThreads.length} non-existent threads with existing replies.`)

	if(nonexistentThreads.length > 0){
		console.log(`Do you want to delete all replies of these non-existent threads?`)
		let confirm = readlineSync.question('yes/no: ')
		if(confirm === "yes"){
			console.log(`Deleting all replies tied to the ${nonexistentThreads.length} nonexistent threads.`)
			for(var i=0; i<nonexistentThreads.length; i++){
				await ThreadReplies.deleteMany({tid: nonexistentThreads[i]})
			}
		}
	}
}

commands.listThreadsWithNoReplies = {
	desc: "Lists threads with no replies",
	func: async () => {
		let threads = await Threads.find().sort({_id: 1}).lean()
		console.log(`Looking through ${threads.length} threads`)
	
		var emptyThreads = []
		for(let thread of threads){
			let replyCount = await ThreadReplies.countDocuments({tid: thread._id})
			if(replyCount === 0) {
				emptyThreads.push(thread._id)
				console.log(`tid:${thread._id} has no replies`)
			}
		}
		console.log(`Found ${emptyThreads.length} empty threads.`)
	
		if(emptyThreads.length > 0){
			console.log(`Do you want to delete all of these empty threads?`)
			let confirm = readlineSync.question('yes/no: ')
			if(confirm !== "yes") return

			console.log(`Deleting all ${emptyThreads.length} empty threads.`)
			for(var i=0; i<emptyThreads.length; i++){
				await Threads.deleteOne({_id: emptyThreads[i]})
			}
		}
	},
}

/*
commands.listThreadsWithInvalidCategory = {
	func: ListThreadsWithInvalidCategory,
	desc: "List threads with non-existent category",
}
async function ListThreadsWithInvalidCategory(){
	let categories = (await Subcategories.find()).map(doc => doc._id)

	let threads = await Threads.find()
	for(let i=0; i<threads.length; i++){
	for(let thread of threads){
		if(categories.indexOf(thread.forum) === -1){
			console.log(`Unknown category '${thread.forum}' tid:${thread.tid}, with topic: '${thread.title}'`)

			if(readlineSync.question('Delete thread? (yes/no): ') === "yes"){
				await mysql.query("DELETE FROM threads WHERE tid=?", thread.tid)
				await mysql.query("DELETE FROM thread_replies WHERE tid=?", thread.tid)
				console.log("Deleted")
			}
		}
	}
}
*/