const router = require('express').Router()

// 	/api/dashboard/settings

router.use(require('./metadata'))
router.use(require('./globalHeadInsert'))

module.exports = router