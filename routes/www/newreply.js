const router = require('express').Router()
const mongoose = require('mongoose')

const accountAPI = require('../../my_modules/accountapi')
const forumAPI = require('../../my_modules/forumapi')

const Threads = mongoose.model('Threads')
const ThreadReplies = mongoose.model('ThreadReplies')

router.get('/:tid/newreply', async (req, res) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account,
        }

        var tid = req.params.tid
        
        //Only logged in users can reply
        if(!req.session || !req.session.uid) return res.redirect('/login')

        //Check if the account is pending an email verification
        if(!await accountAPI.emailVerified(req.session.uid)) return res.status(400).render("400", {reason: "Please login to add a reply to this thread"})

        let threaddata = await Threads.findById(tid).lean()
        if(!threaddata) return res.status(404).send('Thread not found... <a href="/">Click to return</a>')

        //original post
        let op = await ThreadReplies.findOne({tid}).sort({_id: 1})
        if(!op) return res.status(404).send('Dead thread... <a href="/">Click to return</a>')

        threaddata.op = op

        threaddata.category = await forumAPI.GetSubcategory(threaddata.forum)

        //Does this category require a specific role?
        if(!forumAPI.permissionsCheck(threaddata.category.requiredRoles, req.account.roles)) return res.status(400).render("400", {reason: "You lack permissions to post to this category"})
            
        pagedata.threadData = threaddata

        pagedata.initialtext = ""
        if(
            req.query.mention && 
            /^\d+$/.test(req.query.mention) //Should be numbers only
        ) {
            let mentionedAccount = await accountAPI.fetchAccount(req.query.mention)
            if(!mentionedAccount) return res.status(400).render("400", {reason: "You're trying to mention an account that doesn't exist"})
            pagedata.initialtext += `@${mentionedAccount.username},`
        }

        res.render('pages//newreply', pagedata);
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