const router = require('express').Router()
const bodyParser = require('body-parser')
const mongoose = require("mongoose")

const cors = require('../../my_modules/cors')
const notifications = require('../../my_modules/notifications')

const Notifications = mongoose.model("Notifications")

// parse application/json
router.use(bodyParser.json({limit: '5mb'}))

router.use(cors)

// 	/v1/notifications

//Subscribes to native push notifications
router.post('/subscribe', async (req, res) => {
	let response = {success: false}
	
	try{
		if(!req.session.uid) throw "Must be logged in"

		let subscription = req.body
		subscription = JSON.stringify(subscription)

		req.session.webpushsub = subscription
		
        response.success = true
	} catch(e){
		response.reason = "Server error"
		if(typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
});

//Remove website notification from account
router.delete('/', async (req, res) => {
	let response = {success: false}
	
	try{
		var id=req.body.id

		//Delete only one specified notification
		if(id) await notifications.DeleteNotification(id, req.session.uid)
		//No specific id, so just delete everything
		else await Notifications.deleteMany({recipientid: req.session.uid})
        
        response.success = true
	} catch(e){
		response.reason = "Server error"
		if(typeof e === "string")
			response.reason = e;
		else
			console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;