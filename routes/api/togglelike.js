const router = require('express').Router()
const mongoose = require("mongoose")
const accountAPI = require('../../my_modules/accountapi')

const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")

// 	/v1/forum/togglelike

// Likes or unlikes a thread
router.post('/', async (req, res, next) => {
	try{
	    let response = {success: false}

		//Only allow logged in users to view profiles
        if(!req.session.uid) throw 'You must be logged in'
        
        //Sanitize thread reply id
        let trid = parseInt(req.body.trid)
		if(!trid) throw "Thread reply ID not specified"
		if(!Number.isInteger(trid)) throw "Invalid thread reply ID"

        //Email must be verified
        if(!accountAPI.emailVerified(req.session.uid)) throw "Please verify your email address first"

        let likeData = {
            uid: req.session.uid,
            trid,
        }

        //Searches for a like. If it doesn't already exist, this toggle means add new like. Upsert will handle such
        let existingLike = await ThreadReplyReacts.findOneAndUpdate(likeData, likeData, {upsert: true})

        //If a row was found(Like already exists), this toggle means delete
        if(existingLike) await ThreadReplyReacts.deleteOne(likeData) 

        //To update client's likes counter
        response.likes = await ThreadReplyReacts.countDocuments({trid})

        //No early exit, so must've passed
        response.success = true

	    res.json(response)
    } 
    catch(e){
		next(e)
	}
});

module.exports = router;