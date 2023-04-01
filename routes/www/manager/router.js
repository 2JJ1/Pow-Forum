const express = require('express');
const router = express.Router();

// 	/manager

//Displays forum list

router.get('/', async (req, res) => res.redirect('manager/settings'))
router.use('/settings', require('./settings'));
router.use('/info', require('./info'));
router.use('/security', require('./security'));
router.use('/billing', require('./billing'));


module.exports = router;