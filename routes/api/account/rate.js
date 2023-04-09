const router = require('express').Router()
var escape = require('escape-html')
const bodyParser = require('body-parser')
const phraseblacklist = require('phrase-blacklist')
const mongoose = require("mongoose")

const rolesapi = require('../../../my_modules/rolesapi')
const notifications = require('../../../my_modules/notifications')
const accountAPI = require('../../../my_modules/accountapi')

const Notifications = mongoose.model("Notifications")
const Reputations = mongoose.model("Reputations")

// 	/v1/account/rate

// parse application/json
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json({limit: '5mb'}))

router.options('/')
router.post('/', async (req, res, next) => {
	try{
        let response = {success: false}

        //Check if they're logged in first
        if(!req.session.uid) throw "Invalid login session"
        
        //Get the rater's roles (Used in rating sanitization)
        let account = await accountAPI.fetchAccount(req.session.uid)

        //uid validation
        var queryFor = req.body.uid
        if(!queryFor) throw "Missing uid"
        if(typeof queryFor !== "number") throw "Invalid UID"
        if(parseInt(queryFor) === parseInt(req.session.uid)) throw "You cant rate yourself"

        //Sum of requester's reputation
        var selfReputation = await accountAPI.SumReputation(req.session.uid)
        
        // Sanitize rating
        if(!"rating" in req.body) throw "Missing rating"
        var rating = parseInt(req.body.rating)
        //Can only rate 0,(-)1,(-)2
        if((rating !== 0) && (Math.abs(rating) !== 1) && (Math.abs(rating) !== 2)) throw "Invalid rating"
        //Permissions check
        if(!await rolesapi.RolesHasPerm(account.roles, 'rate')) throw "You do not have rate permissions"
        if((Math.abs(rating) === 2) && !await rolesapi.RolesHasPerm(account.roles, 'rate2')) throw "You do not have +2 or -2 permissions"
        if(rating < 0){
            if(await rolesapi.RolesHasRole(account.roles, 'banRepNeg')) throw "You are banned from applying negative reputation"
            else if(selfReputation <= -10) throw "Your reputation is too low to give negative reputation"
        }

        //Sum of targets's reputation
        var targetReputation = await accountAPI.SumReputation(queryFor)

        //When a targets rep dips too low, they're likely a bad actor
        //Prevent rep rescue by blocking positive rep if their rep is too low
        //To be saved, negative reps must be deleted until they're >-20
        if(rating > 0 && targetReputation <= -20) throw "This user's reputation is too low to receive positive reputation"

        //Is it an actual rating?
        if(rating !== 0){
            //Sanitize comment
            var comment = req.body.comment
            if(!comment) throw "Missing comment"
            var commentLength = comment.replace(/\ /g, "").length
            if(commentLength < 12 || commentLength > 300) throw "Comment must be between 12-300 characters in length"
            let isClean = phraseblacklist.isClean(comment.toLowerCase())
		    if(typeof isClean === "string") throw `Please keep your comment friendly(e.g no cussing)! A banned phrase was found: ${isClean}`
            comment = escape(comment)

            //Rate limit to only 3 posts / 24 hours
            //Do not rate limit moderators/admins
            if(!await rolesapi.isModerator(account.roles)){
                await Reputations.countDocuments({from: req.session.uid,date: {$gte: new Date() - 1000*60*60*24}})
                .then(count => {
                    if(count >= 3) throw "You can only rate 3 users in a 24 hour window"
                })
            }

            //Delete an existing reputation if it exists. The following insert is basically a replacement rating
            await Reputations.deleteOne({for: queryFor, from: req.session.uid})
            .then(async ({deletedCount}) => {
                if(deletedCount == 0)  return

                //Deletes notification pertaining to deleted rating
                await Notifications.deleteOne({
                    recipientid: queryFor,
                    senderid: req.session.uid,
                })
            })

            //Saves new rating
            await new Reputations({
                for: queryFor,
                from: req.session.uid,
                diff: rating,
                comment,
                date: new Date(),
            }).save()

            //Sends notification of new rating
            await notifications.SendNotification({
                //webpushsub: req.session.webpushsub,
                type: "newrep",
                recipientid: queryFor,
                senderid: req.session.uid,
                anonymous: rating < 0,
            })
        }
        //0 means delete, so delete the rating
        else {
            await Reputations.deleteOne({for: queryFor, from: req.session.uid})
            .then(async ({deletedCount}) => {
                if(deletedCount == 0) throw "Reputation does not exist"

                //Deletes notification pertaining to deleted rating
                await Notifications.deleteOne({
                    recipientid: queryFor,
                    senderid: req.session.uid,
                })
            })
        }

        response.success = true
        res.json(response)
    } 
    catch(e){
		next(e)
	}
})

router.delete("/", async (req, res, next) => {
	try{
        let response = {success: false}

        //Sanitization
        if(!req.session.uid) throw "Invalid login session"
        if(!req.query.id) throw "Missing reputation ID"

        //Fetch reputation
        var reputation = await Reputations.findById(req.query.id)
        if(!reputation) throw "Reputation doesn't exist"
        
        //Check if they are able to delete the reputation
        if(!await rolesapi.isClientOverpowerTarget(req.session.uid, reputation.from)) throw "You can not delete this reputation"

        //Deletes the reputation
        reputation.remove()

        response.success = true
        res.json(response)
    } 
    catch(e){
		next(e)
	}
})

module.exports = router;