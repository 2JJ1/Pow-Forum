const router = require('express').Router()
const mongoose = require("mongoose")
const envfile = require('envfile')
const fs = require('fs')

const ForumAuditLogs = mongoose.model("ForumAuditLogs")

// 	/api/dashboard/integrations

router.post("/stripe", async (req, res, next) => {
	try{
        let response = {success: false}

        let {secret, public, webhookSecret} = req.body

        //Sanitize and validate
        if(!secret) throw "Missing secret API key"
        if(secret !== "****" && !/^[\w-]{10,}$/.test(secret)) throw "Invalid secret API key"

        if(!public) throw "Missing public API key"
        if(!/^[\w-]{10,}$/.test(public)) throw "Invalid public API key"

        if(!webhookSecret) throw "Missing webhook secret key"
        if(!/^[\w-]{10,}$/.test(webhookSecret)) throw "Invalid webhook secret key"

        // Save changes
        let parsedEnv = envfile.parse(fs.readFileSync('.env', "utf8"))

        if(secret !== "****") {
            parsedEnv.STRIPE_PRIVATE_KEY = secret
            process.env.STRIPE_PRIVATE_KEY = secret
        }

        parsedEnv.STRIPE_PUBLIC_KEY = public
        process.env.STRIPE_PUBLIC_KEY = public

        if(webhookSecret !== "****") {
            parsedEnv.STRIPE_WEBHOOK_PRIVATE_KEY = webhookSecret
            process.env.STRIPE_WEBHOOK_PRIVATE_KEY = webhookSecret
        }

        if(!process.env.STRIPE_PREMIUM_PLAN_ID){
            var stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY)

            const product = await stripe.products.create({
				name: 'Premium Membership',
				description: 'Unlock account features as described on the upgrade page',
				default_price_data: {
					currency: 'USD',
					unit_amount: 500,
					recurring: {
						interval: 'month',
						interval_count: 1
					}
				}
			})
            .catch(e => {
                let {statusCode} = e?.raw

                if(statusCode === 401) throw "Invalid Stripe API private key or public key"
            })

			if(product.default_price){
                parsedEnv.STRIPE_PREMIUM_PLAN_ID = product.default_price
                process.env.STRIPE_PREMIUM_PLAN_ID = product.default_price
			}
        }

        fs.writeFileSync('.env', envfile.stringify(parsedEnv)) 

        //Log audit
		new ForumAuditLogs({
            time: Date.now(),
            type: "captcha v3 updated",
            byUID: req.session.uid,
        })
        .save()
        //Don't fail request over rejected log
        .catch((e) => {console.error(e)})

		//Code hasn't exited, so assume success
		response.success = true
        res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router