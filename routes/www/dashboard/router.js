const express = require('express');
const router = express.Router();

// /dashboard

//Lock these pages to moderators by default
router.use("/", async (req, res, next) => {
    if(!req.session.uid) return res.status(400).render("400", {reason: "No account detected"})

    if(!req.account.isModerator) return res.status(400).render("400", {reason: "Only moderators may view this page"})

    next()
})

//Some pages are admin only
function AdminRequirement(req, res, next){
    if(!req.account.isAdmin) return res.status(400).render("400", {reason: "Only admins may view this page"})
    
    next()
}

//Dashboard home
router.use('/', require('./index'));

//Admins
router.use("/settings", AdminRequirement, require('./settings'))
router.use("/integrations", AdminRequirement, require('./integrations'))
router.use("/categories", AdminRequirement, require('./categories'))
router.use("/moderators", AdminRequirement, require('./moderators'))

//Moderators
router.use('/auditlog', require('./auditlog'));
router.use('/allreplies', require('./allreplies'));

module.exports = router;