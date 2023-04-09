const router = require('express').Router()

// 	/api/account/logout

router.post('/', async (req, res, next) => {
	try{
		let response = {success: false}

		//Check if user is already logged in.
		if(!req.session.uid) throw "Already logged out";

		//Ends session
		req.session.destroy()

		//No problems -> Resolve successfully
		response.success = true

		res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router