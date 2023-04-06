const router = require('express').Router()

const rolesAPI = require('../../../my_modules/rolesapi')

// 	/api/dashboard

//Lock these pages to moderators by default
router.use(async (req, res, next) => {
    if(!req.session.uid) return res.status(401).send("No account detected")

    if(!await rolesAPI.isModerator(req.session.uid)) return res.status(401).send("Only moderators may view this page")

    next()
})

//Some pages are admin only
async function AdminRequirement(req, res, next){
    if(!await rolesAPI.isAdmin(req.session.uid)) return res.status(401).send("Only admins may view this page")
    
    next()
}

//Moderators
router.use(require('./removeprofilepicture'))
router.use("/lockaccount", require('./lockaccount'))

//Admins
router.use('/settings', AdminRequirement, require('./settings/router'))
router.use('/categories', AdminRequirement, require('./categories/router'))
router.use("/account", AdminRequirement, require('./deleteaccount'))
router.use("/integrations", AdminRequirement, require("./integrations/router"))

module.exports = router;