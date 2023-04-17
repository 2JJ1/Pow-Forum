const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const forumAPI = require('../../../my_modules/forumapi')
const buildpfp = require('../../../my_modules/buildpfp')

const Accounts = mongoose.model("Accounts")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")

// 	/profile/threads

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account
        }

        var queryFor = parseInt(req.query.uid || req.session.uid)
        if(!Number.isInteger(queryFor)) throw "Invalid target user ID"
        var ftid = req.query.ftid || 0 //From thread id
        
        // Retrieve main account data
        pagedata.profileInfo = await Accounts.findById(queryFor).lean()
        .then(async result => {
            if(result){
                result.profilepicture = buildpfp(result.profilepicture)
                return result
            }
            else throw "Account doesn't exist"
        })

        let query = {uid: queryFor}
        if(ftid) query._id = {$gt: ftid}
        let threads = await Threads.find(query).sort({_id: -1}).limit(16).lean()

        //Add additional data
		for (let thread of threads){
			//amount of replies on thread
			//OP is not a reply, so subtract 1
			thread.replies = await ThreadReplies.countDocuments({tid: thread._id}) - 1
            thread.category = await forumAPI.GetSubcategory(thread.category)
		}

        //I only send pages of 15, but I hackily query for 16 just to see if there is more pages
        pagedata.moreAvailable = threads.length > 15
        pagedata.threads = threads.slice(0,15)
        
        if(!pagedata.accInfo) res.redirect('/login')
        else res.render('pages/profile/threads', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;