const router = require('express').Router()

router.use(require("./get"))
router.use(require("./post"))
router.use(require("./delete"))
router.use("/verify", require('./verify'))

module.exports = router;