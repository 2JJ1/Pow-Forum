const router = require('express').Router()
const mongoose = require("mongoose")

const NotificationSettings = mongoose.model("NotificationSettings")

// update account info tab
router.post('/', async (req, res, next) => {
	try{
		let response = {success: false}

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
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

module.exports = router;