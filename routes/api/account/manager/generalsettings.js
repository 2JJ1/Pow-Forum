const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const GeneralSettings = mongoose.model("GeneralSettings")

// update account info tab
router.post('/', async (req, res) => {
	let response = {success: false}
	
	try{
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
	}
	catch(e){
		response.reason = "Server error"
		if (typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;