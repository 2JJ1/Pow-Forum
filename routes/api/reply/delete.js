const router = require('express').Router()
const mongoose = require("mongoose")

const rolesAPI = require('../../../my_modules/rolesapi')

const Notifications = mongoose.model("Notifications")
const ForumAuditLogs = mongoose.model("ForumAuditLogs")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")
const ThreadReplyReacts = mongoose.model("ThreadReplyReacts")
const PinnedThreads = mongoose.model("PinnedThreads")

// /api/thread/reply

//Delete reply
router.delete('/', async (req, res) => {
	let response = {success: false}
	
	try{
		//Check if logged in
		if(!req.session.uid) throw "Not logged in"
		
		let targetReplyID = parseInt(req.body.trid)
		if(!targetReplyID) throw "Thread reply ID not specified"
		if(!Number.isInteger(targetReplyID)) throw "Invalid thread reply id"
		
		//Get target reply
		let targetReply = await ThreadReplies.findById(targetReplyID)
		if(!targetReply) throw "Thread reply not found"
		
		//Check if client has permission to delete requested replier
		if(!await rolesAPI.isClientOverpowerTarget(req.session.uid, targetReply.uid)) throw "No permission"
		
		//Get original post
		let OP = await ThreadReplies.findOne({tid: targetReply.tid}).sort({_id: 1})
		if(!OP) throw "Could not find the original post" //Should be impossible to ever throw but... Who knows?

		//Check if original post's trid matches the target reply's trid
		let isOP = OP._id == targetReply._id

		//Is the reply the original post
		if(isOP){
			//Without the original post, there is no context for the following replies, so,
			//Delete the entire thread(thread and it's replies)
			await Threads.deleteOne({_id: targetReply.tid})
			await ThreadReplies.find({tid: targetReply.tid})
			.then(async replies => {
				for(let reply of replies){
					//Deletes comments
					await ThreadReplies.deleteMany({trid: reply._id})
					await ThreadReplyReacts.deleteMany({trid: reply._id})
					//Prevent ghost notifications
					await Notifications.deleteMany({tid: targetReply.tid})
					await reply.remove()
				}
			})
			await PinnedThreads.deleteOne({_id: targetReply.tid})
			response.deletedThread = true
		}
		//Post is a regular reply
		else{
			//Only delete the specifically requested thread reply
			await ThreadReplies.deleteOne({_id: targetReply._id})
			// Delete data associated with reply
			//Deletes comments
			await ThreadReplies.deleteMany({trid: targetReply._id})
			await ThreadReplyReacts.deleteMany({trid: targetReply._id})
			//Prevent ghost notifications
			await Notifications.deleteMany({trid: targetReplyID})
		}

		//Log audit
		var log = new ForumAuditLogs({
			time: Date.now(),
			type: isOP ? "delete-thread" : "delete-reply",
			tid: targetReply.tid, //What thread was affected
			targetUID: targetReply.uid, //Who owned the reply
			byUID: req.session.uid, //Who deleted the reply
		})
		await log.save()
		
		//No exception was thrown, so must've been successful
		response.success = true
	}
	catch(e){
		response.reason = "Server error"
		if(typeof e === "string") response.reason = e
		else console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;