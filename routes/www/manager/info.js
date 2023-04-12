const express = require('express')
const router = express.Router()

// 	/manager/info

router.get('/', async (req, res, next) => {
	try {
		let pagedata = {
			powForum: req.powForum,
			accInfo: req.account
		}
		
		if(!req.session.uid) return res.status(400).redirect('/login')

		res.render('pages/manager/info', pagedata)
	}
    catch(e){
        next(e)
    }
})

module.exports = router;