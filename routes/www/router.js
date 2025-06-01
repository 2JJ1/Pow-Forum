const express = require('express')
const router = express.Router()
const mongoose = require("mongoose")

const onlinetracker = require("../../my_modules/onlinetracker")
const rolesapi = require("../../my_modules/rolesapi")
const accountAPI = require("../../my_modules/accountapi")
const { CompileNotifications } = require('../../my_modules/notifications')

const Accounts = mongoose.model("Accounts")
const ForumSettings = mongoose.model("ForumSettings")
const NavigationBarLinks = mongoose.model("NavigationBarLinks")
const FooterLinks = mongoose.model("FooterLinks")

//Get forum settings
router.use(async function(req, res, next){
    let powForum = {}

    //Expected to contain title, 
    powForum.name = (await ForumSettings.findOne({type: "name"}))?.value

    powForum.globalHeadInsert = (await ForumSettings.findOne({type: "globalHeadInsert"}))?.value

    powForum.navLinks = await NavigationBarLinks.find().lean()

    powForum.footerLinks = await FooterLinks.find().lean()

    req.powForum = powForum
    next()
})

//Build account information
router.use(async function(req, res, next){
    req.account = {}

	//Exit if no session exists
    if(!req.session.uid) return next()

    //Fetch account information
    let account = await accountAPI.fetchAccount(req.session.uid)

    //Exit if account not found
    if(!account) {
	    req.session.destroy()
        return next()
    }

    if("locked" in account) return res.status(403).render("400", {"reason": `Your account has been locked<br>Reason: ${account.locked || "Unknown"}`})

    //Build account info
    account.highestRole = await rolesapi.GetHighestRole(account.roles)
    account.isAdmin = await rolesapi.isAdmin(account.roles)
    account.isModerator = await rolesapi.isModerator(account.roles)
    account.isPatron = await rolesapi.isPatron(account.roles)
    account.isVIP = await rolesapi.isVIP(account.roles)
    
    account.notifications = await CompileNotifications(req.session.uid)

    //Weird place to put this, but... Twas lazy and its easy to find anyway
    account.webpushsub = req.session.webpushsub

    //Attach account information to the request
    req.account = account

    return next()
})

//Sets last online time
router.use(async function(req, res, next){
    if(req.session?.uid) await Accounts.updateOne({_id: req.session.uid}, {lastonline: new Date()})
    return next()
})

//Tracks online forum users
router.use(async function(req, res, next){
    await onlinetracker.track(req)
    next()
})

//Displays forum list
router.use('/', require('./index'))

//Thread view
router.use('/t', require('./thread')); // /:tid

//List of threads for forum
router.use('/c', require('./forum')); // /:forum

//Thread Creator
router.use('/c', require('./newthread')); // /:forum/newthread

router.use('/login', require('./login'));
router.use('/register', require('./register'));
router.use('/recovery', require('./recovery'));
router.use('/passreset', require('./passreset'));
router.use('/upgrade', require('./upgrade/router'));
router.use('/verify', require('./verify'));

router.use('/profile', require('./profile/router'));

router.use('/manager', require('./manager/router'));

router.use("/dashboard", require("./dashboard/router"))

module.exports = router;
