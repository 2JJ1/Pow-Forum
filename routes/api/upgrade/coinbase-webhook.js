const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const mongoose = require('mongoose')
var Webhook = require('coinbase-commerce-node').Webhook;

const other = require('../../../my_modules/other')
const mailgun = require('../../../my_modules/mailgun')
const accountAPI = require('../../../my_modules/accountapi')

const ForumSettings = mongoose.model("ForumSettings")
const Accounts = mongoose.model("Accounts")

// 	/api/upgrade/coinbase-webhook

//Webhook. Stripe calls to this point. A call to this is never from the forum
router.use('/', bodyParser.raw({type: '*/*'}))
router.post('/', async (req, res) => {
    let forumTitle = process.env.TITLE

	try {
	    let signature = req.headers["x-cc-webhook-signature"];

        const event = Webhook.verifyEventBody(req.body, signature, process.env.COINBASE_WEBHOOK_SECRET);

        let uid
        if(event.data.metadata) uid = event.data.metadata.customer_id
        if(!uid) return res.send("TEMP FOR THE BROKEN CALL")

        switch(event.type) {
            case "charge:confirmed": {
                var acc = await accountAPI.fetchAccount(uid)
                if(!acc) throw new Error("Account doesn't exist for uid: " + uid)

                //User has successfully been charged, so apply the Patron role if necessary
                if(acc.roles.indexOf("patron") === -1) acc.roles.push('patron')

                //Updates the account in the database to reflect data
                await Accounts.updateOne({_id: uid}, {premium_expires: new Date() + 1000*60*60*24*30, roles: JSON.stringify(acc.roles)})

                //Send thank you email
                let emailBody = 
                `Premium Membership Enrollment - ${forumTitle} \n` +
                '\n' +
                'Payment received. Thank you so much for giving us your support! Seriously, it is very appreciated. Your support comes with benefits during your term. You can find a list of patron benefits at: \n' +
                process.env.FORUM_URL + '/upgrade \n' +
                '\n' +
                'Please note that benefits are subject to change. Especially with the intent of adding more benefits. You will be billed at $5 USD monthly.  \n' +
                '\n' +
                '\n' +
                'Email intended for: \n' +
                `Email: ${acc.email} . \n` +
                `Username: ${acc.username} \n` +
                `User ID: ${uid} \n`
                await mailgun.SendBasicEmail(acc.email, `Payment Confirmation - ${forumTitle}`, emailBody)
            }
            break

            case "charge:failed": {
                var acc = await Accounts.findById(uid)
                if(!acc) throw new Error("Account doesn't exist for uid: " + uid)

                //Inform of failure to pay
                let emailBody = 
                `Payment Failed | ${forumTitle} \n` +
                '\n' +
                'Your payment for your premium membership has failed. Please try again after checking your wallet.\n' +
                '\n' +
                '\n' +
                'Email intended for: \n' +
                `Email: ${acc.email} . \n` +
                `Username: ${acc.username} \n` +
                `User ID: ${acc._id} \n`
                await mailgun.SendBasicEmail(acc.email, `Premium Expired - ${forumTitle}`, emailBody)

                break
            }

            case "charge:pending": {
                var acc = await Accounts.findById(uid)
                if(!acc) throw new Error("Account doesn't exist for uid: " + uid)

                //Inform of pending payment
                let emailBody = 
                `Premium Purchase Processing | ${forumTitle} \n` +
                '\n' +
                'Your payment for your premium membership is currently processing. Because you chose to pay with Crypto,\n' +
                'this may take up to an hour long. It is usually much faster.\n' +
                '\n' +
                '\n' +
                'Email intended for: \n' +
                `Email: ${acc.email} . \n` +
                `Username: ${acc.username} \n` +
                `User ID: ${acc._id} \n`
                await mailgun.SendBasicEmail(acc.email, `Premium Purchase Processing - ${forumTitle}`, emailBody)

                break
            }
        }
		
		// Return a response
		res.json({received: true});
	}
	catch (e) {
		//The server has errored... Report 400 so Stripe can keep retrying
		//While PayPal retries, this gives me the opportunity to fix the server error
		//Once the server error is fixed, PayPal will eventually call again to give the account benefits
		console.log("Coinbase Commerce Webhook error-", e)
		res.status(400).send("Server error")
	}
});

module.exports = router;