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

		let tid = req.query.tid
		if(!tid) throw "Incomplete request. Missing thread id"

		let rowsPerPage = 5

		let query = { 
			tid,
			trid: { $exists: 1 }, 
			verified: {$ne: false}
		 }
		let {fromId} = req.query
		fromId = parseInt(fromId)
		if(!Number.isInteger(fromId)) throw "Invalid request"
		if("fromId" in req.query) query._id = {$gt: fromId}
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