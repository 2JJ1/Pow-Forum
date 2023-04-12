const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const onlinetracker = require('../../my_modules/onlinetracker')
const forumapi = require('../../my_modules/forumapi')
const {fetchAccount} = require('../../my_modules/accountapi')

const ForumSettings = mongoose.model("ForumSettings")
const SupportLinks = mongoose.model("SupportLinks")
const Threads = mongoose.model("Threads")
const ThreadReplies = mongoose.model("ThreadReplies")

let cachedCategories
let lastCacheTime

router.get('/', async (req, res, next) => {
	try {
		let pagedata = {
			powForum: req.powForum,
			accInfo: req.account,
			categoryGroups: await forumapi.GetCategories(),
			categories: await forumapi.GetSubcategories(),
			description: (await ForumSettings.findOne({type: "description"})).value
		}

		/*
		Handle caching- Only generate category new data every 3 seconds
		Without caching, this page is CPU expensive. A basic ddos attack could take a cheap server down.
		*/
		if(lastCacheTime && new Date().getTime() - lastCacheTime < 3000) pagedata.categories = cachedCategories
		//Updates cache
		else{
			//Compile extra data for each category
			for(let category of pagedata.categories) {
				//Counts how many threads there are with x category name
				category.threadcount = await Threads.countDocuments({category: category._id})

				//Checks how many replies are in x category name
				let replyCount = await ThreadReplies.countDocuments({category: category._id})
				//Each thread has at least 1 post(The original post), so decrement that as OP is not a reply
				category.replies = replyCount - category.threadcount

				//Gets the latest reply in this category
				category.latestReply = await ThreadReplies.findOne({category: category._id}).sort({_id: -1}).lean()
				.then(async reply => {
					if(!reply) return

					category.latestReplyThread = await Threads.findById(reply.tid)

					//We display the original post information
					let originalPost = await ThreadReplies.findOne({tid: reply.tid}).sort({_id: 1})
					reply.date = originalPost.date

					//Who created the original post
					category.latestReplyThread.OP = await fetchAccount(category.latestReplyThread.uid, {fallback: true})

					return reply
				})
			}

			//Save to cache
			cachedCategories = pagedata.categories
			lastCacheTime = new Date().getTime()
		}

		pagedata.onlines = await onlinetracker.retrieve()

		pagedata.supportLinks = await SupportLinks.find().lean()

		res.render('pages//index', pagedata)
	} 
	catch(e) {
		next(e)
	}
})

module.exports = router;