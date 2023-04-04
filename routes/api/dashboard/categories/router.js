const router = require('express').Router()

// 	/api/dashboard/categories

router.use(require('./addcategory'))
router.use(require('./deletecategory'))
router.use(require('./editcategorygroupname'))
router.use(require('./editsubcategory'))
router.use(require('./changecategory'))
router.use(require('./addsubcategory'))
router.use(require('./deletesubcategory'))

module.exports = router;