const express = require('express');
const router = express.Router();

// 	/profile

//Displays forum list

router.use('/', require('./profile'));
router.use('/reputation', require('./reputation'))
router.use('/rate', require('./rate'))
router.use('/threads', require('./threads'))
router.use('/alts', require('./alts'))
router.use('/search', require('./search'))

module.exports = router;