const router = require('express').Router()
const mongoose = require('mongoose')

const buildpfp = require('../../../my_modules/buildpfp')
const { ProcessMentions } = require('../../../my_modules/pfapi')
const rolesapi = require('../../../my_modules/rolesapi')
const accountAPI = require('../../../my_modules/accountapi')

const Accounts = mongoose.model("Accounts")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")

// 	/profile/alts

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account
        }

        let accounts = await Accounts.find().sort({_id: -1}).limit(15)
        for (let account of accounts){
            account.profilepicture = buildpfp(account.profilepicture)
        }
		pagedata.accounts = accounts

        var replies = await ThreadReplies.find().sort({_id: -1}).limit(16).lean()
        for(let replyRow of replies){
            //Grabs the first reply assigned to that thread
            var OP = await ThreadReplies.findOne({tid: replyRow.tid}).sort({_id: 1})
            replyRow.isOP = OP._id === replyRow._id
            var thread = await Threads.findById(replyRow.tid)
            replyRow.threadTitle = thread ? thread.title : "[Missing]"

            //Replaces mentions with a username and link to their profile
            replyRow.content = await ProcessMentions(replyRow.content)

            replyRow.isLowerRanked = await rolesapi.isClientOverpowerTarget(req.session.uid, replyRow.uid)

            replyRow.account = await accountAPI.fetchAccount(replyRow.uid)
        }

        //I only send pages of 15, but I hackily query for 16 just to see if there is more pages
        pagedata.moreFeedAvailable = replies.length > 15
        pagedata.activityFeed = replies.slice(0,15)

        res.render('pages/dashboard/index', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;