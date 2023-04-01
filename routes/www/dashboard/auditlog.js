const router = require('express').Router();
const mongoose = require("mongoose")

const accountAPI = require('../../../my_modules/accountapi');

const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const Accounts = mongoose.model("Accounts")

// 	/profile/alts

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account
        }

        var page = req.query.page || 1
        if(page < 1) throw "Invalid page"

        //Get latest logs
        var logs = await ForumAuditLogs.find({}, null, {limit: 30, skip: (page - 1) * 30, sort: {'_id': -1}}).lean()

        //Get detailed data from metadata
        for(let i in logs){
            let log = logs[i]
            if(log.byUID) log.byUsername = await accountAPI.GetUsername(log.byUID)

            if(log.targetUID) log.targetUsername = await accountAPI.GetUsername(log.targetUID)

            if(log.tid){
                let thread = await Threads.findById(log.tid)
                log.topic = thread ? thread.title : "[DeletedThread]"
            }

            if(log.type === "edit"){
                let reply = await ThreadReplies.findById(log.trid)

                //Deletes log if the reply no longer exists
                //Left off here. The delete seems to cause issues in render
                if(!reply){
                    await ForumAuditLogs.deleteOne({_id: log._id})
                    logs.splice(i, 1)
                    continue
                }

                let thread = await Threads.findById(reply.tid)
                let replierAccount = await accountAPI.fetchAccount(reply.uid, {fallback: true})

                log.byUID = reply.uid
                log.byUsername = replierAccount.username
                log.tid = reply.tid
                log.topic = thread ?  thread.title : "[DeletedThread]"
            }

            log.timestamp = log._id.getTimestamp()
        }

        pagedata.logs = logs

        res.render('pages/dashboard/auditlog', pagedata)
    }
    catch(e){
        if(typeof e === "string") res.status(400).render("400", {reason: e})
        else next(e)
    }
});

module.exports = router;