const router = require('express').Router()

// 	/api/dashboard/integrations

router.use(require('./mailgun'))
router.use(require('./captcha'))
router.use(require('./stripe'))
router.use(require('./coinbasecommerce'))
router.use(require('./openai'))

module.exports = router;