require('dotenv').config()
const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const webpush = require('web-push')
const app = express()
const http = require('http').Server(app);
const mongoose = require('mongoose')
const helmet = require("helmet")
const compression = require('compression')
const socketio = require("socket.io")
const crypto = require('crypto')

const updateEnv = require('./my_modules/updateenv')
const other = require('./my_modules/other')

// MongoDB setup

//Loads up all models
require('./models')
const ForumSettings = mongoose.model("ForumSettings")
const Accounts = mongoose.model("Accounts")

//Database cleanup
async function CleanMongoDatabase(){
	//Deletes old active user counts
	await mongoose.model("ActiveUsers").deleteMany({time: {$lt: Date.now() - 60000*15}})

	//Deletes forum audit logs older than 30 days
	await mongoose.model("ForumAuditLogs").deleteMany({time: {$lt: Date.now() - 1000*60*60*24*30}})

	//Deletes messages older than 90 days
	await mongoose.model("Messages").deleteMany({time: {$lt: Date.now() - 1000*60*60*24*90}})

	//Removes premium from expired Crypto payers
	let expiredPremiumMembers = await Accounts.find({premium_expires: {$lt: new Date()}})
	for(let expiredPremiumMember of expiredPremiumMembers){
		let roles = other.StringToArray(expiredPremiumMember.roles)

		//Removes their patron role
		let index = roles.indexOf("patron")
		if(index != -1) roles.splice(index, 1);

		//Give them the VIP role as a token of appreciation
		if(roles.indexOf("vip") === -1) roles.push("vip")

		//Save changes
		expiredPremiumMember.roles = JSON.stringify(roles)
		await expiredPremiumMember.save()
	}
}

//Connect to database
let mongoURL = `mongodb://127.0.0.1:27017/${process.env.DATABASE_NAME || "db_powrum"}`
mongoose.set('strictQuery', false)
mongoose.connect(mongoURL)
.then(async ()=> {
	console.log("MongoDB database connected")

	//Automatic database setup for required documents or placeholder documents
	{
		let settings = await ForumSettings.find().lean()

		//Sets default description
		if(!settings.find(setting => setting.type === "description")) {
			await new ForumSettings({
				type: "description",
				value: "An online community powered by Powrum"
			}).save()
		}

		//Much of this stores into process.env so the process does not need to query the database everytime for highly reused data

		// Manages web-push configuration
		//Generates push notification VAPID keys if the private or public vapid key is missing
		if(!process.env.PRIVATE_VAPID_KEY || !process.env.PUBLIC_VAPID_KEY) {
			let vapidKeys = webpush.generateVAPIDKeys()

			updateEnv({
				PRIVATE_VAPID_KEY: vapidKeys.privateKey,
				PUBLIC_VAPID_KEY: vapidKeys.publicKey,
			})
		}
		webpush.setVapidDetails(`mailto:${process.env.SUPPORT_EMAIL_ADDRESS}`, process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);

		//Creates original(bot) account if it doesn't exist
		//I say original because uid assumes the identity of this forum
		//If there are zero accounts, create an account
		if(!await Accounts.countDocuments()){
			await new Accounts({
				username: "BOT"
			})
			.save()
		}
	}

	//Clean database on every launch
	CleanMongoDatabase()
	//Clean database every 24 hours
	setInterval(CleanMongoDatabase, 1000 * 60 * 60 * 24)
})

// Express.js configuration

//Helps protect from some well-known web vulnerabilities by setting HTTP headers appropriately.
app.use(helmet())

//Compress all responses
app.use(compression())

//Trust first proxy
app.set('trust proxy', 1)

//set the view engine to ejs
app.set('view engine', 'ejs')

//gibe me kreditz
app.use((req, res, next) => {
    res.append('X-Forum-Software', 'Powrum');
    next();
});

//In case nginx doesn't send for some reason...
app.use(express.static('public'))
app.use(express.static('public', { extensions: ['html'] }))

// Login session initialization

//Generate session secret if one does not exist
if(!process.env.SESSION_SECRET) {
	updateEnv({SESSION_SECRET: crypto.randomBytes(64).toString('hex')})
}

//Express routes will get sessions through session
let sessionConf = {
	secret: process.env.SESSION_SECRET,
	name: process.env.SESSION_COOKIE_NAME || '_PFSec',
	store: MongoStore.create({
		mongoUrl: mongoURL,
		stringify: false,
	}),
	saveUninitialized: false, //Prevents every single request from being recognized as a session
	rolling: true, //Resets expiration date
	resave: true, //Resaves cookie on server. Necessary because of the expiration date being reset
	cookie: { 
		httpOnly: process.env.FORUM_URL && new URL(process.env.FORUM_URL).hostname !== "localhost",
		secure: process.env.FORUM_URL && new URL(process.env.FORUM_URL).hostname !== "localhost",
		maxAge: 1000*60*60*24*365 // (1 week in milliseconds) 1 second -> 1 minute -> 1 hour -> 1 day -> 1 year
	}
}
if(process.env.COOKIE_DOMAIN) sessionConf.cookie.domain = process.env.COOKIE_DOMAIN
let sessionMiddleware = session(sessionConf)

//Express server use session 
app.use(sessionMiddleware)

// Define what HTTP routes to listen for

//Handle the API
app.use('/api/', require('./routes/api/router'))

//Handle everything else. Aka the view
function isSetup(){
	if(!process.env.FORUM_URL) return false
	if(!process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_APIKEY) return false
	return true
}
module.exports.isSetup = isSetup

let wwwRouter = require("./routes/install/index")
app.use("/", (req, res, next) => wwwRouter(req, res, next))
if(isSetup()) wwwRouter = require('./routes/www/router')

//No route matched? Default route -> Send 404 page
app.use(function(req, res, next){
	res.status(404).render("404")
})

//Express.js exception handling
app.use(function(err, req, res, next) {
	try {
		let isAPIRoute = req.originalUrl.split("/")[1] == "api"

		if (typeof err === "string") {
			if(!isAPIRoute) res.status(400).render("400", {reason: err})
			else res.status(400).json({success: false, reason: err})
		}
		else if(err.name === "URIError") {
			if(!isAPIRoute) res.status(400).render("400", {reason: "Bad request: Invalid URI"})
			else res.status(400).json({success: false, reason: "Bad request: Invalid URI"})
		}
		else{
			console.log(`Express.js error at path: [${req.method}]${req.originalUrl}\n`, err)
			if(!isAPIRoute) res.status(500).render("500", {reason: "The server has errored... This will be fixed when the admins have noticed"})
			else res.status(500).json({success: false, reason: "The server has errored... This will be fixed when the admins have noticed"})
		}
	}
	catch(e){
		console.log("Exception handler just errored: ", e)
	}
})

//Starts HTTP server
http.listen(process.env.PORT || 8087, () => {
	console.log(`Powrum server started on http://localhost:${process.env.PORT || 8087}`)
})

// Socket.io configuration

//Create Socket.io server
const io = new socketio.Server(http)
module.exports.io = io

//Websocket server use session
io.engine.use(sessionMiddleware)

//Listen to websocket requests
io.on('connection', require('./my_modules/websocket'))