const router = require('express').Router()
const mongoose = require('mongoose')

const Sessions = mongoose.model('Sessions')

// 	/api/account/sso

//secure sign out
router.post('/', async (req, res, next) => {
	try{
		let response = {success: false}

		if(!req.session.uid) throw "Not logged in"

		await Sessions.deleteMany({session: new RegExp(`"uid":${req.session.uid}[},]`)})
		
		response.success = true
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

module.exports = router;