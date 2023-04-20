const express = require('express');
const router = express.Router()
const mongoose = require('mongoose')

const forumapi = require('../../my_modules/forumapi')
const accountAPI = require('../../my_modules/accountapi')

const Subcategories = mongoose.model("Subcategories")

router.get('/:forum/newthread', async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
        }

        let subcategory = parseInt(req.params.forum)
        if(!Number.isInteger(subcategory)) throw "Invalid subcategory"

        //Only logged in users can create threads
        if(!req.session.uid) throw "Please login to create a thread"

        //Check if the account is pending an email verification
        if(!await accountAPI.emailVerified(req.session.uid)) throw "Please verify your email to create a thread"

        //Check if the category exists
        if(!await Subcategories.findById(req.params.forum)) throw "Category does not exist"

        pagedata.forumData = {
            name: req.params.forum,
            category: await forumapi.GetSubcategory(subcategory),
        }

        //Check if client can post here
        if(!forumapi.permissionsCheck(pagedata.forumData.category.requiredRoles, pagedata.accInfo.roles)) throw "You lack permissions to post threads in this category"
        
        res.render('pages//newthread', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;