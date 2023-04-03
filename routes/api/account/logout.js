const router = require('express').Router()

// 	/api/account/logout

router.post('/', async (req, res) => {
	let response = {success: false}
	try{
		//Check if user is already logged in.
		if(!req.session.uid) throw "Already logged out";

		//Ends session
		req.session.destroy()

		//No problems -> Resolve successfully
		response.success = true
	} 
	catch(e){
		response.reason = typeof e === "string" ? e : "Server error"
	}

	res.json(response)
});

module.exports = router;