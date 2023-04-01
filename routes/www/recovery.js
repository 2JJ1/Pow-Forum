const express = require('express');
const router = express.Router();

// 	/register

router.get('/', async (req, res) => {
	let pagedata = {
		powForum: req.powForum,
		accInfo: req.account
	}
    
    res.render('pages/recovery', pagedata);
});

module.exports = router;