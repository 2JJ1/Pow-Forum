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

		//Sanitize subscription
		subscription = {
			endpoint: subscription.endpoint,
			expirationTime: subscription.expirationTime,
			keys: {
				auth: subscription.keys.auth,
				p256dh: subscription.keys.p256dh,
			}
		}

		if(typeof subscription.endpoint !== "string") throw "Invalid subscription"
		if(typeof subscription.endpoint.length > 300) throw "Invalid subscription"

		//expirationTime is only ever null or a DOMHighResTimeStamp(number)
		if(
			subscription.expirationTime !== null && 
			subscription.expirationTime !== undefined && 
			typeof subscription.expirationTime !== "number"
		) throw "Invalid subscription"

		if(typeof subscription.keys.auth !== "string") throw "Invalid subscription"
		if(typeof subscription.keys.auth.length > 300) throw "Invalid subscription"

		if(typeof subscription.keys.p256dh !== "string") throw "Invalid subscription"
		if(typeof subscription.keys.p256dh.length > 300) throw "Invalid subscription"

		req.session.webpushsub = JSON.stringify(subscription)
		
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