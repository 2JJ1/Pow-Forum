const router = require('express').Router()
const mongoose = require("mongoose")

let accountAPI = require('../../../my_modules/accountapi')
let rolesAPI = require('../../../my_modules/rolesapi')

const ThreadReplies = mongoose.model("ThreadReplies")
const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")

// /api/thread/comments

router.get("/comments", async (req, res, next) => {
	try{
		let response = {success: false}

		let { trid, fromId } = req.query

		if(!trid) throw "Missing thread id"
		trid = parseInt(trid)
		if(!Number.isInteger(trid)) throw "Invalid request"

		let rowsPerPage = 5

		let query = { 
			trid,
		}

		// Unverified replies handling
        //Filters out unverified replies by other users
		//Moderators can see all unverified replies
		if(!(await rolesAPI.isModerator(req.session.uid))) {
			query.$or = [
                {uid: req.session.uid, verified: false}, 
                {verified: {$ne: false}}
			]
		}

		// Load comments after a specific comment
		if(fromId) {
			fromId = parseInt(fromId)
			if(!Number.isInteger(fromId)) throw "Invalid request"
			query._id = {$gt: fromId}
		}

		let replies = await ThreadReplies.find(query, {uid: 1, content: 1, date: 1}).sort({_id: 1}).limit(rowsPerPage + 1).lean()
		response.moreAvailable = replies.length > rowsPerPage
		replies = replies.slice(0,rowsPerPage)

		for(let comment of replies){
			comment.account = await accountAPI.fetchAccount(comment.uid, {projection: {username: 1}, reputation: 1})
			comment.likes = await ThreadReplyReacts.countDocuments({trid: comment._id})
            comment.liked = await ThreadReplyReacts.exists({trid: comment._id, uid: req.session.uid})
			comment.deletable = (req.session.uid === comment.uid) || await rolesAPI.isClientOverpowerTarget(req.session.uid, comment.uid)
		}

		response.comments = replies
			
		//Code hasn't exited, so assume success
		response.success = true
		res.json(response)
	} 
	catch(e){
		next(e)
	}
})

module.exports = router