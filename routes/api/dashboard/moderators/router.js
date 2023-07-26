const router = require('express').Router()

// 	/api/dashboard/moderators

router.use(require('./addmod'))
router.use(require('./removemod'))

module.exports = router