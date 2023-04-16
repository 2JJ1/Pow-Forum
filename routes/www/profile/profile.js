const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const other = require('../../../my_modules/other')
const badges = require("../../../my_modules/badges")
const rolesapi = require('../../../my_modules/rolesapi')
const buildpfp = require('../../../my_modules/buildpfp')
const accountAPI = require('../../../my_modules/accountapi')
const { ProcessMentions } = require('../../../my_modules/pfapi')

const GeneralSettings = mongoose.model("GeneralSettings")
const ThreadReplies = mongoose.model("ThreadReplies")
const Threads = mongoose.model("Threads")

const { monthNames } = require('../../../my_modules/month')

// 	/profile
router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
		    powForum: req.powForum,
            accInfo: req.account,
            allowDMs: true,
        }

        var queryFor = parseInt(req.query.uid || req.session.uid)
        //Redirect to login if trying to view self-profile without an account
        if(!queryFor && !req.session.uid) return res.redirect("/login")
        //Sanitize
        else if(isNaN(queryFor)) return res.status(400).render("400")

        pagedata.viewingSelf = queryFor === req.session.uid
        
        // Retrieve main account data
        pagedata.profileInfo = await accountAPI.fetchAccount(queryFor)
        .then(async user => {
            if(user){
                user.badges = []
                for(var i=0; i<user.roles.length; i++){
                    if(badges[user.roles[i]])
                        user.badges.push(badges[user.roles[i]])
                }
                delete user.roles

                //Shorts join date to eg. Dec 2019
                var joinDate = new Date(user.creationdate)
                if(!isNaN(joinDate)){
                    //Adds veteran role if account is 1 year old
                    if(new Date()-joinDate>1000*60*60*24*365) user.badges.push(badges["veteran"])

                    joinDate = `${monthNames[joinDate.getMonth()].substr(0,3)}, ${joinDate.getFullYear()}`
                    user.joinDate = joinDate
                    delete user.creationdate
                }
                else user.joinDate = "???"

                //Sum of reputation
                user.reputation = await accountAPI.SumReputation(queryFor)
                
                return user
            }
            else throw "Account doesn't exist"
        })

        var replies = await ThreadReplies.find({uid: queryFor}).sort({_id: -1}).limit(16).lean()
        for(let replyRow of replies){
            //Grabs the first reply assigned to that thread
            var OP = await ThreadReplies.findOne({tid: replyRow.tid}).sort({_id: 1})
            replyRow.isOP = OP._id === replyRow._id
            var thread = await Threads.findById(replyRow.tid)
            replyRow.threadTitle = thread ? thread.title : "[Missing]"

            //Replaces mentions with a username and link to their profile
            replyRow.content = await ProcessMentions(replyRow.content)
        }

        //I only send pages of 15, but I hackily query for 16 just to see if there is more pages
        pagedata.moreFeedAvailable = replies.length > 15
        pagedata.activityFeed = replies.slice(0,15)
        pagedata.isLowerRanked = await rolesapi.isClientOverpowerTarget(req.session.uid, queryFor)

        //Respect member's wishes for DM restrictions
		let generalSettings = await GeneralSettings.findById(queryFor)
		pagedata.allowDMs = (generalSettings && generalSettings.privateMessages === false) ? false : true
        
        if(!pagedata.accInfo) res.redirect('/login')
        else res.render('pages/profile/profile', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;