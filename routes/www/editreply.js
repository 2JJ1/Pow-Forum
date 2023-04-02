const express = require('express');
const router = express.Router()
const mongoose = require("mongoose")

const forumapi = require('../../my_modules/forumapi')

const ThreadReplies = mongoose.model("ThreadReplies")
const Threads = mongoose.model("Threads")

router.get('/:trid', async (req, res) => {
	let pagedata = {
		powForum: req.powForum,
		accInfo: req.account,
	}
	
    //Only logged in users can reply
    if(!req.session.uid) return res.redirect('/login')

	try {
    	if(!req.params.trid) throw {safe: "Thread reply ID not specified"}
		
		pagedata.replyData = await ThreadReplies.findById(req.params.trid)
		.then(result => {
			if(result){
				//only the creator can edit the reply
				if(result.uid != req.session.uid) throw {safe:"You can't edit this reply"}
				return result
			}
			throw {safe:"Reply doesn't exist"}
		})

		pagedata.replyData.threaddata = await Threads.findById(pagedata.replyData.tid).lean()
		.then(async result => {
			if(result){
				result.category = await forumapi.GetSubcategory(result.forum)
				return result
			}
			throw {safe:"Thread replied to doesn't exist"}
		})
		
		res.render('pages//editreply', pagedata);
	} 
	catch(e){
		let reason = "Server error"
		if(e.safe && e.safe.length > 0) reason = e.safe;
		else console.warn(e)

		res.status(400).render("400", {reason})
	}
});

module.exports = router;