const router = require('express').Router();

// 	/profile/alts

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account
        }

        res.render('pages/dashboard/index', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;