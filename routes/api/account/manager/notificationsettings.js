const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const NotificationSettings = mongoose.model("NotificationSettings")

// update account info tab
router.post('/', async (req, res) => {
	let response = {success: false}
	
	try{
		//Only allow logged in users
		if(!req.session.uid) throw "Not logged in"

		var {newMessages, threadReplies, forumMentions, newProfileRating} = req.body

		//Sanitize & guarantee boolean value
		newMessages = newMessages == true
		threadReplies = threadReplies == true
		forumMentions = forumMentions == true
		newProfileRating = newProfileRating == true

		//Upsert notification settings
		await NotificationSettings.updateOne(
			{_id: req.session.uid}, 
			{newMessages, threadReplies, forumMentions, newProfileRating},
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