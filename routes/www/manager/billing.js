const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')

const Accounts = mongoose.model('Accounts')

// /manager/security

router.get('/', async (req, res, next) => {
	try {
		let pagedata = {
			powForum: req.powForum,
			accInfo: req.account
		}

		if(!req.session.uid){
			res.status(400).redirect('/login');
			return
		}
		
		var moreAccInfo = await Accounts.findById(req.session.uid).lean()
		.then(async result => {
			if(pagedata.accInfo.isPatron){
				if(typeof result.pendingcancellation === 'string' && result.pendingcancellation.length > 0)
					result.pendingcancellation = true;
			}
			
			return result
		})

		Object.assign(pagedata.accInfo, moreAccInfo)
		
		res.render('pages/manager/billing', pagedata)
	}
    catch(e){
        next(e)
    }
})

module.exports = router;