const express = require('express')
const router = express.Router()

// 	/api/dashboard/categories

router.use(require('./addcategory'))

module.exports = router;