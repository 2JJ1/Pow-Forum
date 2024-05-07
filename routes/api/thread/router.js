const router = require('express').Router()

// /api/thread

router.use(require('./post'))
router.use(require("./comments"))
router.use(require('./edittopic'))
router.use(require('./changeforum'))
router.use(require('./togglelock'))
router.use(require('./togglepin'))

module.exports = router;