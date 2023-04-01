const express = require('express');
const router = express.Router();

// 	/login

router.get('/', async (req, res) => {
	let pagedata = {
		powForum: req.powForum,
		accInfo: req.account,
	}
    
    //Return to home page if they're already logged in
    if(req.session.uid) return res.redirect('/')
	
    res.render('pages/login', pagedata);
});

module.exports = router;