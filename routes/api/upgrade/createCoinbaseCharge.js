const router = require('express').Router()
const fetch = require("node-fetch")

const rolesAPI = require('../../../my_modules/rolesapi')

// 	/api/upgrade/createCoinbaseCharge

// Locks or unlocks a thread
router.post('/', async (req, res, next) => {
	try{
        let response = {success: false}

		//Only allow logged in users to view profiles
        if(!req.session.uid) throw 'Login required'

        //Prevents double purchasing
        if(await rolesAPI.isPatron(req.session.uid)) throw "You're already a premium member"

        //Creates a Coinbase charge
        let coinbaseCharge = await fetch("https://api.commerce.coinbase.com/charges", {
            method: "POST",
            headers: { 
                'X-CC-Api-Key': process.env.COINBASE_API_KEY,
                'X-CC-Version': '2018-03-22',
                'Content-Type': 'application/json', 
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                "name": "WeAreDevs Premium",
                "description": `Unlocks additional account features as described at ${process.env.FORUM_URL}/upgrade`,
                local_price: {
                    amount: 5.00,
                    currency: "USD"
                },
                pricing_type: "fixed_price",
                metadata: {
                    customer_id: req.session.uid
                },
                redirect_url: `${process.env.FORUM_URL}/upgrade/pending`,
                cancel_url: `${process.env.FORUM_URL}/upgrade`,
            })
        })
        .then(res => res.json())

        response.hosted_url = coinbaseCharge.data.hosted_url

        //No early exit, so must've passed
        response.success = true
        res.json(response)
    } 
    catch(e){
		next(e)
	}
})

module.exports = router;