const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const cors = require('../../../my_modules/cors');

// 	/api/account...

// parse application/json
//Every route below only needs to parse json
router.use(bodyParser.json({limit: '5mb'}))

//Every route below needs cors 
router.use(cors)

//Handle routes
router.use('/sso', require('./sso'))
//secure sign out
router.use('/recovery', require('./recovery'))
router.use('/login', require('./login'))
router.use('/logout', require('./logout'));
router.use('/register', require('./register'))
router.use('/manager', require('./manager/router'))
router.use('/verifyemail', require('./verifyemail'))
router.use('/rate', require('./rate'))
router.use("/activity", require("./activity"))
router.use("/threads", require("./threads"))
router.use("/search", require("./search"))

module.exports = router;