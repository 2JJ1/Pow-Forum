const router = require('express').Router()

// /api/thread

router.use(require("./comments"))

module.exports = router;