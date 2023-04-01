const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const cors = require('../../../my_modules/cors');
const accountAPI = require('../../../my_modules/accountapi');

// 	/v1/message

// parse application/json
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json({limit: '5mb'}))

//Every route below needs cors 
router.use(cors)

//Handle routes

//Prechecks
router.use(async (req, res, next) => {
    try{
        //Must be logged in to deal with DMs
        if(!req.session.uid) throw "An account is required"

        //Check if the user's email is verified.
        if(!await accountAPI.emailVerified(req.session.uid)) throw "Please verify your email first!"
        
        next()
    }
    catch(e){
        return res.status(400).json({success: false, reason: typeof e === "string" ? e : "Unknown error occured"})
    }
})

//List of conversatiojns
router.use('/dmslist', require('./dmslist'))

module.exports = router;