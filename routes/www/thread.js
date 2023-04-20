const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const forumapi = require('../../my_modules/forumapi')
const rolesapi = require('../../my_modules/rolesapi')
const accountAPI = require('../../my_modules/accountapi')
const badges = require("../../my_modules/badges")
const onlinetracker = require("../../my_modules/onlinetracker")
const { ProcessMentions } = require('../../my_modules/pfapi')
const { CompileNotifications } = require('../../my_modules/notifications')
const { monthNames } = require('../../my_modules/month')

const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")
const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const Notifications = mongoose.model("Notifications")
const PinnedThreads = mongoose.model("PinnedThreads")
const DownloadLinks = mongoose.model("DownloadLinks")

//Display's thread page on forum
router.get('/:tid', async (req, res, next) => {
    try {
        let tid = req.params.tid
        if(isNaN(tid)) return next("Invalid thread ID")

        await Notifications.deleteMany({tid, recipientid: req.session.uid})
        if(req.session.uid) req.account.notifications = await CompileNotifications(req.session.uid)

        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
            categoryGroups: await Categories.find().lean(),
            categories: await Subcategories.find().lean(),
        }

        //Get forum and topic
        let result = await Threads.findOneAndUpdate({_id: tid}, {$inc: { views: 1 } }).lean()
        //Thread exists, so update view count
        if(!result)  return res.status(404).render('404', {reason: 'This thread does not exist'})

        result.category = await forumapi.GetSubcategory(result.category)

        // Pagination
        let resultsPerPage = 15
        result.currentPage = parseInt(req.query.page) || 1 //Default to page 1
        //Paginates by resultsPerPage rows. Multiply by specified page - 1 because database indexing starts at 0, not 1.
        let startingRow = resultsPerPage * (result.currentPage - 1)

        var totalReplies = await ThreadReplies.countDocuments({tid, trid: {$exists: false}})

        result.totalPages = Math.ceil(totalReplies/resultsPerPage)

        if(result.currentPage > result.totalPages) return res.redirect(302, `/t/${tid}?page=${result.totalPages}`)

        // Is a notification taking them to a certain reply?
        if(req.query.r){
            let skipToReply = parseInt(req.query.r)

            //Handle for comment replies
            let reply = await ThreadReplies.findById(skipToReply).lean()
            if(!reply) return next("The reply you're trying to skip to does not exist")
            if(reply.tid != tid) return next("The reply you're trying to skip to does not belong to this thread")
            if("trid" in reply) {
                skipToReply = reply.trid
            }
            
            //Instructs page to scroll to the reply
            result.scrollToTrid = skipToReply
            //Auto page change to where reply can be found
            let replies = await ThreadReplies.find({tid, trid: {$exists: false}}).sort({_id: 1})
            replies = replies.map(row => row._id)
            let replyIndex = replies.indexOf(skipToReply)
            if(replyIndex > resultsPerPage){
                let skipToPage = Math.floor(replyIndex / resultsPerPage)
                startingRow = resultsPerPage * skipToPage
                result.currentPage = skipToPage + 1
            }
        }

        // Check if client can create a new thread on the forum
        //Must have the necessary permission to post here
        result.canReply = forumapi.permissionsCheck(result.category.requiredRoles, req.account.roles)

        //Sum of reputation
        var reputation = await accountAPI.SumReputation(req.session.uid)
        //Reputation must be greater than -20
        if(reputation<=-20) result.canReply = false
        
        //Get original post
        var OP = await ThreadReplies.findOne({tid}).sort({_id: 1})

        //Can't reply to 3 month old threads (Prevent necro posting)
        //Add 90 days to the thread start date to determine reply expiration
        var replyExpires = new Date(OP.date)
        replyExpires.setDate(replyExpires.getDate() + 30*3)
        if(new Date() > replyExpires) result.canReply = false

        var threadEditExpires = new Date(OP.date)
        threadEditExpires.setMinutes(threadEditExpires.getMinutes() + 10)
        result.canEditTopic = OP.uid == req.session.uid && new Date() < threadEditExpires

        //Disable replies for locked threads
        if(result.locked == true) result.canReply = false

        //Check if is pinned
        result.pinned = await PinnedThreads.findById(tid) ? true : false

        //Reflect disabled 3rd party replies if linked as release more info page
        //If linked as release more info page, disable replies from 3rd parties
        if(req.session.uid !== result.uid) { //Did client create this thread?
            //Check if this thread is link
            let count = await DownloadLinks.countDocuments({tid})
            if(count > 0) result.canReply = false
        }
        
        // Get replies
        result.replies = await ThreadReplies.find({tid, trid: {$exists: false}}).sort({_id: 1}).skip(startingRow).limit(resultsPerPage).lean()

        async function AppendReplyMetadata(replies){
            //Append replier data to each reply
            for(let replyRow of replies) {
                //Replaces mentions with a username and link to their profile
                replyRow.content = await ProcessMentions(replyRow.content)
        
                //Grab replier and get their account info
                let accInfo = await accountAPI.fetchAccount(replyRow.uid, {fallback: true})
                .then(async accountRow => {
                    if(accountRow._id == 0) return accountRow
        
                    //How many posts they've made, aka thread replies
                    accountRow.totalposts = await ThreadReplies.countDocuments({uid: replyRow.uid})
        
                    //How many threads they've made
                    accountRow.totalthreads = await Threads.countDocuments({uid: replyRow.uid})
        
                    //Shorts join date to eg. Dec 2019
                    var joinDate = new Date(accountRow.creationdate)
                    joinDate = `${monthNames[joinDate.getMonth()].substr(0,3)}, ${joinDate.getFullYear()}`
                    accountRow.joinDate = joinDate
        
                    //Sum of reputation
                    accountRow.reputation = await accountAPI.SumReputation(replyRow.uid)
        
                    accountRow.badge = badges[accountRow.highestRole]
        
                    return accountRow
                })
        
                replyRow.account = accInfo
        
                //Fetch other data
                replyRow.signature = accInfo.signature
        
                replyRow.likes = await ThreadReplyReacts.countDocuments({trid: replyRow._id})
                replyRow.liked = await ThreadReplyReacts.exists({trid: replyRow._id, uid: req.session.uid})
                
                replyRow.deletable = (req.session.uid === replyRow.uid) || await rolesapi.isClientOverpowerTarget(pagedata.accInfo._id, replyRow.uid)

                //Fetch comments
                replyRow.comments = await ThreadReplies.find({trid: replyRow._id}).sort({_id: 1}).limit(6).lean()
                replyRow.moreCommentsAvailable = replyRow.comments.length > 5
                replyRow.comments = await AppendReplyMetadata(replyRow.comments.slice(0,5))
            }
            
            return replies
        }

        result.replies = await AppendReplyMetadata(result.replies)
        
        result.nextPageAvailable = totalReplies > (startingRow + result.replies.length)

        //ex: Move a thread from suggestions forum to the complaints forum
        //result[0] = first reply = thread creator, so compare to that uid
        result.canChangeForum = await rolesapi.isClientOverpowerTarget(pagedata.accInfo._id, result.replies[0].uid)

        pagedata.clientIsMod = await rolesapi.isModerator(pagedata.accInfo.roles)

        pagedata.ogTRID = OP._id

        pagedata.threadData = result

        pagedata.onlines = await onlinetracker.retrieve({req})

        res.render('pages//thread', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;