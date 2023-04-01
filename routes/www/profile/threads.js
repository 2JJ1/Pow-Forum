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

        var queryFor = req.query.uid || req.session.uid
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

        let threads = await Threads.find({uid: queryFor, _id: {$gt: ftid}}).sort({_id: -1}).limit(16).lean()

        //Add additional data
		for (let thread of threads){
			//amount of replies on thread
			//OP is not a reply, so subtract 1
			thread.replies = await ThreadReplies.countDocuments({tid: thread._id}) - 1
		}

        //I only send pages of 15, but I hackily query for 16 just to see if there is more pages
        pagedata.moreAvailable = threads.length > 15
        pagedata.threads = threads.slice(0,15)
        
        //Assign human subcategory name
        for(let thread of pagedata.threads){
            thread.category = await forumAPI.GetCategory(thread.forum)
        }
        
        if(!pagedata.accInfo) res.redirect('/login')
        else res.render('pages/profile/threads', pagedata)
    }
    catch(e){
        if(typeof e === "string") res.status(400).render("400", {reason: e})
        else next(e)
    }
});

module.exports = router;