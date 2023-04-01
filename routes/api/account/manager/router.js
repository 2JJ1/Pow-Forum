const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

// 	/v1/account/manager

// parse application/json
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json({limit: '5mb'}))

//Handle routes
router.use('/generalsettings', require('./generalsettings'))
router.use('/notificationsettings', require('./notificationsettings'))
router.use('/profilepicture', require('./profilepicture'))
router.use('/info', require('./info'))
router.use('/usegravatar', require('./usegravatar'))
router.use('/security', require('./security'))

module.exports = router;