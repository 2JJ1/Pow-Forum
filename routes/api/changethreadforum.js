const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')

const rolesapi = require('../../my_modules/rolesapi')
const forumapi = require('../../my_modules/forumapi')
const accountAPI = require('../../my_modules/accountapi')

const Threads = mongoose.model('Threads')
const ThreadReplies = mongoose.model('ThreadReplies')

// 	/v1/forum/changethreadforum

// Post a reply to forum thread
router.post('/', async (req, res) => {
	let response = {success: false}
	
	try{
		//Only allow logged in users to view profiles
		if(!req.session.uid) throw 'You must be logged in'

		let tid = parseInt(req.body.tid)
		if(!tid) throw "Thread ID not specified"
		if(!Number.isInteger(tid)) throw "Invalid thread id"

		let forum = req.body.forum
		if(typeof forum !== "string") throw "Invalid forum"

        //Get original poster's uid
        var thread = await Threads.findById(tid)
		//Returned undefined because a thread was not found with the specified id
		if(!thread) throw {safe: "Thread doesn't exist"}

        //Check if client has permission to move the thread. OP and mods should be able to do this
        if(!await rolesapi.isClientOverpowerTarget(req.session.uid, thread.uid)) throw {safe: 'You lack power over the original poster'};

		//Get category
		let category = await forumapi.GetCategory(forum)

        //Check if the forum exists
		if(!category) throw {safe: "Invalid category"};

        //Check if client has access to the forum
		let account = await accountAPI.fetchAccount(req.session.uid)
		if(!forumapi.permissionsCheck(category.requiredRoles, account.roles)) throw {safe: 'No permission to post here'};
            
        //Update the thread's forum
		await Threads.updateOne({_id: tid}, {forum})
		await ThreadReplies.updateMany({tid}, {forum})

        //No early exit, so must've passed
        response.success = true
	} catch(e){
		response.reason = "Server error"
		if(e.safe && e.safe.length > 0)
			response.reason = e.safe;
		else
			console.warn(e)
	}
	
	res.json(response)
});

module.exports = router;