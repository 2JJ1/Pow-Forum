const express = require('express')
const router = express.Router()

// 	/api/dashboard/integrations

router.use(require('./mailgun'))
router.use(require('./grecaptcha2'))
router.use(require('./grecaptcha3'))
router.use(require('./stripe'))
router.use(require('./coinbasecommerce'))
router.use(require('./openai'))

module.exports = router;