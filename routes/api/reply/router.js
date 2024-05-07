const router = require('express').Router()

router.use(require("./get"))
router.use(require("./post"))
router.use(require("./delete"))
router.use(require("./patch"))

router.use("/verify", require('./verify'))
router.use(require('./togglelike'))

module.exports = router;