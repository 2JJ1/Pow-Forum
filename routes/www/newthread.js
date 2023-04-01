const express = require('express');
const router = express.Router()
const mongoose = require('mongoose')

const forumapi = require('../../my_modules/forumapi')
const accountAPI = require('../../my_modules/accountapi')

const Categories = mongoose.model("Categories")

router.get('/:forum/newthread', async (req, res) => {
	try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account,
        }

        //Only logged in users can create threads
        if(!req.session.uid) return res.status(400).render("400", {reason: "Please login to create a thread"})

        //Check if the account is pending an email verification
        if(!await accountAPI.emailVerified(req.session.uid)) return res.status(400).render("400", {reason: "Please verify your email to create a thread"})

        //Check if the category exists
        if(!await Categories.findOne({database: req.params.forum})) return res.status(400).render("404", {reason: "Category does not exist"})

    	pagedata.forumData = {
            name: req.params.forum,
            category: await forumapi.GetCategory(req.params.forum),
        }

        //Check if client can post here
        if(!forumapi.permissionsCheck(pagedata.forumData.category.requiredRoles, pagedata.accInfo.roles)) return res.status(400).render('400', {reason: "You lack permissions to post threads in this category"})
		
		res.render('pages//newthread', pagedata);
	} catch(e){
		let reason = "Server error"
		if(e.safe && e.safe.length > 0)
			reason = e.safe;
		else
			console.warn(e)

		res.status(200).send(reason)
	}
});

module.exports = router;