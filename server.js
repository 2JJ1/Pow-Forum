require('dotenv').config();

const Express = require('express'),
    Session = require('express-session'),
    MongoStore = require('connect-mongo'),
    Webpush = require('web-push');

//Open HTTP server
const App = express(),
    Mongoose = require('mongoose'),
    Helmet = require("helmet"),
    Compression = require('compression'),
    HTTP = require('http').Server(app),
    SocketIO = require("socket.io"),
    Envfile = require('envfile'),
    Fs = require('fs');

const UpdateEnv = require('./my_modules/updateenv');
const { CreateLogger, Format, Transports } = require("winston");

/* 
Added for better usage of Console.

Logs information, Outputs into the Console! (it's cool & also outputs more information)

    Usage:
        logger.info(string: message);
        logger.warn(string: message);
        logger.error(string: message);
*/

const logger = createLogger({
    level: 'info',
    format: combine(
        label({ label: 'SystemOS' }),
        timestamp(),
        printf(info => {
            return `${info.timestamp} | [${info.label}] [${info.level.toUpperCase()}]: ${info.message}`;
        })
    ),
    transports: [
        new transports.Console()
    ]
});

if (!process.env.SUPPORT_EMAIL_ADDRESS) {
    logger.error("Missing support email address. Please run 'npm run setup'");
    process.exit(2);
}

if (!process.env.FORUM_URL) {
    logger.error("Missing domain. Please run 'npm run setup'");
    process.exit(2);
}

if (!process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_APIKEY || !process.env.MAILGUN_NOREPLY_ADDRESS) {
    logger.error("Incomplete mailgun setup. Please run 'npm run setup'");
    process.exit(2);
}

// MongoDB setup

//Loads up all models
require('./models');
const ForumSettings = mongoose.model("ForumSettings");

//Database cleanup
async function CleanMongoDatabase() {
    //Deletes old active user counts
    await Mongoose.model("ActiveUsers").deleteMany({ time: { $lt: Date.now() - 60000 * 15 } })

    //Deletes forum audit logs older than 30 days
    await Mongoose.model("ForumAuditLogs").deleteMany({ time: { $lt: Date.now() - 1000 * 60 * 60 * 24 * 30 } })

    //Deletes messages older than 14 days
    await Mongoose.model("Messages").deleteMany({ time: { $lt: Date.now() - 1000 * 60 * 60 * 24 * 14 } })
}

//Connect to database
let MongoURL = `mongodb://localhost:27017/${process.env.DATABASE_NAME || "PFForum"}`
Mongoose.set('strictQuery', false)
Mongoose.connect(MongoURL)
    .then(async () => {
        logger.info("MongoDB database connected")

        //Automatic database setup for required documents or placeholder documents
        {
            let Settings = await ForumSettings.find().lean()

            //Sets default title
            if (!Settings.find(setting => setting.type === "title")) {
                await new ForumSettings({
                    type: "title",
                    value: "Pow Forums"
                }).save()
            }

            //Sets default description
            if (!Settings.find(setting => setting.type === "description")) {
                await new ForumSettings({
                    type: "description",
                    value: "An online community powered by Pow Forums"
                }).save()
            }

            //Much of this stores into process.env so the process does not need to query the database everytime for highly reused data

            // Manages web-push configuration
            //Generates push notification VAPID keys if the private or public vapid key is missing
            if (!process.env.PRIVATE_VAPID_KEY || !process.env.PUBLIC_VAPID_KEY) {
                let VapidKeys = webpush.generateVAPIDKeys()

                UpdateEnv({
                    PRIVATE_VAPID_KEY: VapidKeys.privateKey,
                    PUBLIC_VAPID_KEY: VapidKeys.publicKey,
                })
            }
            webpush.setVapidDetails(`mailto:${process.env.SUPPORT_EMAIL_ADDRESS}`, process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);
        }

        //Clean database on every launch
        CleanMongoDatabase()
        //Clean database every 24 hours
        setInterval(CleanMongoDatabase, 1000 * 60 * 60 * 24)
    })

// Express.js configuration

//Helps protect from some well-known web vulnerabilities by setting HTTP headers appropriately.
app.use(Helmet())

//Compress all responses
app.use(Compression())

//Trust first proxy
app.set('trust proxy', 1)

//set the view engine to ejs
app.set('view engine', 'ejs')

app.use((req, res, next) => {
    res.append('X-Forum-Software', 'Pow-Forum');
    next();
});

//In case nginx doesn't send for some reason...
app.use(express.static('public'))
app.use(express.static('public', { extensions: ['html'] }))

// Login session initialization

//Generate session secret if one does not exist
if (!process.env.SESSION_SECRET) {
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
let SessionConf = {
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
        maxAge: 1000 * 60 * 60 * 24 * 365 // (1 week in milliseconds) 1 second -> 1 minute -> 1 hour -> 1 day -> 1 year
    }
}
if (process.env.COOKIE_DOMAIN) SessionConf.cookie.domain = process.env.COOKIE_DOMAIN
let SessionMiddleware = session(SessionConf)

//Express server use session 
app.use(SessionMiddleware)

// Define what HTTP routes to listen for

//Handle the API
app.use('/api/', require('./routes/api/router'))

//Handle everything else. Aka the view
app.use("/", require('./routes/www/router'))

//No route matched? Default route -> Send 404 page
app.use(function (req, res, next) {
    res.status(404).render("404")
})

//Express.js exception handling
app.use(function (Err, Req, Res, Next) {
    try {
        if (typeof Err === "string") return Res.status(400).render("400", { reason: Err })
        else if (Err.name === "URIError") return Res.status(400).render("400", { reason: "Bad request: Invalid URI" })
        else {
            var FullUrl = Req.protocol + '://' + Req.get('host') + Req.originalUrl;
            logger.warn(`Express.js error: ${Err}, URL errored on: ${FullUrl}`)
            return Res.status(400).send("The server has errored, This will be fixed when the admins have noticed.");
        }
    }
    catch (e) {
        logger.info("Exception handler just errored: ", e)
    }
})

//Starts HTTP server
HTTP.listen(process.env.PORT || 8087, () => {
    logger.info(`Pow Forum server started on http://localhost:${process.env.PORT || 8087}`)
})

// Socket.io configuration

//Create Socket.io server
const IO = new socketio.Server(http)
module.exports.io = IO

//Websocket server use session
IO.engine.use(SessionMiddleware)

//Listen to websocket requests
IO.on('connection', require('./my_modules/websocket'))
