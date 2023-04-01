const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')

const rolesAPI = require('../../../my_modules/rolesapi')
const accountAPI = require('../../../my_modules/accountapi')
const buildpfp = require('../../../my_modules/buildpfp')
const { ProcessMentions } = require('../../../my_modules/pfapi')

const ThreadReplies = mongoose.model("ThreadReplies")
const Accounts = mongoose.model("Accounts")
const Threads = mongoose.model("Threads")

//Display's thread page on forum
router.get('/', async (req, res) => {
	let pagedata = {
		powForum: req.powForum,
		accInfo: req.account
    }

    var page = req.query.page || 1
    if(page < 1) page = 1

    //Get all replies
    let replies = await ThreadReplies.find().sort({_id: -1}).skip((page-1)*25).limit(25).lean()

    //Go through each reply and link additional wanted data
    for(let reply of replies){
        //Grab replier and get their account info
        reply.user = await accountAPI.fetchAccount(reply.uid, {fallback: true})
        .then(async user => {
            if(user._id == 0) return user

            user.reputation = await accountAPI.SumReputation(reply.uid)

            user.highestRole = await rolesAPI.GetHighestRole(user.roles)
            
            return user
        })
       
        //What thread this reply is for
        reply.thread = (await Threads.findById(reply.tid)) || {forum: "[UNKNOWN]", title: "[Content Deleted]"}

        //Replaces mentions with a username and link to their profile
        reply.content = await ProcessMentions(reply.content)

        // Fetch other data

        reply.deletable = req.session.uid === reply.uid || await rolesAPI.isClientOverpowerTarget(pagedata.accInfo._id, reply.uid)

        /* TODO- Implement below */

        //ex: Move a thread from suggestions forum to the complaints forum
        //result[0] = first reply = thread creator, so compare to that uid
        reply.canChangeForum = await rolesAPI.isClientOverpowerTarget(req.session.uid, reply.uid)
    }

    res.render('pages/dashboard/allreplies', {...pagedata, replies});
});

module.exports = router;