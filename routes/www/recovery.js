const express = require('express');
const router = express.Router();

// 	/register

router.get('/', async (req, res, next) => {
	try {
		let pagedata = {
			powForum: req.powForum,
			accInfo: req.account
		}
		
		res.render('pages/recovery', pagedata)
	}
    catch(e){
        next(e)
    }
})

module.exports = router;