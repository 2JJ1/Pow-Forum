const express = require('express');
const router = express.Router();

// 	/upgrade

//Displays forum list

router.use((req, res, next) => {
	if(!process.env.STRIPE_PREMIUM_PLAN_ID) next("Stripe has not been configured")
	else next()
})

router.use('/', require('./upgrade'));
router.use('/pending', require('./pending'));


module.exports = router;