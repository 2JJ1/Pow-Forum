require('dotenv').config()
const express = require('express')
var session = require('express-session')
const MongoStore = require('connect-mongo')
const webpush = require('web-push')
//Open HTTP server
const app = express()
const mongoose = require('mongoose')
const helmet = require("helmet")
var compression = require('compression')
const http = require('http').Server(app);
const socketio = require("socket.io")
const envfile = require('envfile')
const fs = require('fs')

const updateEnv = require('./my_modules/updateenv')

if(!process.env.SUPPORT_EMAIL_ADDRESS) {
	console.error("Missing support email address. Please run the 'setup' command in the PF-CLI.")
	process.exit(2)
}

if(!process.env.FORUM_URL) {
	console.error("Missing domain. Please run the 'setup' command in the PF-CLI.")
	process.exit(2)
}

if(!process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_APIKEY || !process.env.MAILGUN_NOREPLY_ADDRESS) {
	console.error("Incomplete mailgun setup. Please run the 'setup' command in the PF-CLI.")
	process.exit(2)
}

// Express.js configuration

//Helps protect from some well-known web vulnerabilities by setting HTTP headers appropriately.
app.use(helmet())

//Compress all responses
app.use(compression())

//Trust first proxy
app.set('trust proxy', 1)

//set the view engine to ejs
app.set('view engine', 'ejs')

//In case nginx doesn't send for some reason...
app.use(express.static('public'))
app.use(express.static('public', { extensions: ['html'] }))

//Express.js exception handling
app.use(function(err, req, res, next) {
	try {
		if(err.name === "URIError") return res.status(400).send("Bad request: Invalid URI");
		else{
			var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
			console.log("Express.js error:", err, `. For URL: ${fullUrl}`)
			return res.status(400).send("The server has errored... This will be fixed when the admins have noticed");
		}
	}
	catch(e){
		console.log("Exception handler just errored: ", e)
	}
})

// Socket.io configuration

//Create Socket.io server
const io = new socketio.Server(http)
module.exports.io = io

// MongoDB setup

//Loads up all models
require('./models')
const ForumSettings = mongoose.model("ForumSettings")

//Database cleanup
async function CleanMongoDatabase(){
	//Deletes old active user counts
	await mongoose.model("ActiveUsers").deleteMany({time: {$lt: Date.now() - 60000*15}})

	//Deletes forum audit logs older than 30 days
	await mongoose.model("ForumAuditLogs").deleteMany({time: {$lt: Date.now() - 1000*60*60*24*30}})

	//Deletes messages older than 14 days
	await mongoose.model("Messages").deleteMany({time: {$lt: Date.now() - 1000*60*60*24*14}})
}

//Connect to database
let mongoURL = `mongodb://localhost:27017/${process.env.DATABASE_NAME || "PFForum"}`
mongoose.set('strictQuery', false)
mongoose.connect(mongoURL)
.then(async ()=> {
	console.log("MongoDB database connected")

	//Automatic database setup for required documents or placeholder documents
	{
		let settings = await ForumSettings.find().lean()

		//Sets default title
		if(!settings.find(setting => setting.type === "title")) {
			await new ForumSettings({
				type: "title",
				value: "Pow Forums"
			}).save()
		}

		//Sets default description
		if(!settings.find(setting => setting.type === "description")) {
			await new ForumSettings({
				type: "description",
				value: "An online community powered by Pow Forums"
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
	}

	//Clean database on every launch
	CleanMongoDatabase()
	//Clean database every 24 hours
	setInterval(CleanMongoDatabase, 1000 * 60 * 60 * 24)

	app.emit('ready')
})

//Wait for database to connect before starting the HTTP listener
app.on('ready', async function(){
	// Login session initialization

	//Generate session secret if one does not exist
	if(!process.env.SESSION_SECRET) {
		let result = '';
		let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let charactersLength = characters.length;
		let counter = 0;
		while (counter < 20) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
			counter += 1;
		}

		let parsedEnv = envfile.parse(fs.readFileSync('.env', "utf8"))
		parsedEnv.SESSION_SECRET = result
		fs.writeFileSync('.env', envfile.stringify(parsedEnv))

		process.env.SESSION_SECRET = result
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
			httpOnly: process.env.NODE_ENV !== 'development' && new URL(process.env.FORUM_URL).hostname !== "localhost",
			secure: process.env.NODE_ENV !== 'development' && new URL(process.env.FORUM_URL).hostname !== "localhost",
			maxAge: 1000*60*60*24*365 // (1 week in milliseconds) 1 second -> 1 minute -> 1 hour -> 1 day -> 1 year
		}
	}
	if(process.env.COOKIE_DOMAIN) sessionConf.cookie.domain = process.env.COOKIE_DOMAIN
	let sessionMiddleware = session(sessionConf)

	//Express server use session 
	app.use(sessionMiddleware)

	// Setup listeners
	//Listeners placed here because routes must be the very last middleware in order for other middleware to take effect

	//Websocket server use session
	io.engine.use(sessionMiddleware)

	// Define what HTTP routes to listen for
	//Handle the API
	app.use('/api/', require('./routes/api/router'))
	//Handle everything else. Aka the view
	app.use("/", require('./routes/www/router'))
	//No route matched? Default route -> Send 404 page
	app.use(function(req, res, next){
		res.status(404).render("404")
	})

	//Listen to websocket requests
	io.on('connection', require('./my_modules/websocket'))

	//Starts HTTP server
	http.listen(process.env.PORT || 8087, () => {
		console.log(`Pow Forum server started on http://localhost:${process.env.PORT || 8087}`)
	})
})