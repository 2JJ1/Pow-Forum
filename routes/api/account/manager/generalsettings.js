const router = require('express').Router()
const mongoose = require("mongoose")

const GeneralSettings = mongoose.model("GeneralSettings")

// update account info tab
router.post('/', async (req, res, next) => {
	try{
		let response = {success: false}

		//Only allow logged in users
		if(!req.session.uid) throw "Not logged in"

		var {privateMessages} = req.body

		//Sanitize & guarantee boolean value
		privateMessages = privateMessages == true

		//Upsert notification settings
		await GeneralSettings.updateOne(
			{_id: req.session.uid}, 
			{privateMessages},
			{upsert: true},
		)
		
		response.success = true
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

module.exports = router;