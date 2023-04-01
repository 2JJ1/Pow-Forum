const router = require('express').Router()
const mongoose = require('mongoose')

const Sessions = mongoose.model('Sessions')

// 	/api/account/sso

//secure sign out
router.post('/', async (req, res) => {
	let response = {success: false}

	try{
		if(!req.session.uid) throw "Not logged in"

		await Sessions.deleteMany({session: new RegExp(`"uid":${req.session.uid}[},]`)})
		
		response.success = true
	}
	catch(e){
		if(typeof e === "string") response.reason = e
		else {
			response.reason = "Server error"
			console.log(e)
		}
	}

	res.json(response);
})

module.exports = router;