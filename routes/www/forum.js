const express = require('express');
const router = express.Router();
const queryString = require('query-string')
const mongoose = require('mongoose')

const forumapi = require('../../my_modules/forumapi');
const onlinetracker = require('../../my_modules/onlinetracker')
const accountAPI = require('../../my_modules/accountapi')
const other = require('../../my_modules/other')

const Threads = mongoose.model('Threads')
const ThreadReplies = mongoose.model('ThreadReplies')
const PinnedThreads = mongoose.model('PinnedThreads')

router.get('/:forum', async (req, res, next) => {
	// Sort query
	if(req.query.order === "latest_post") {
		let parsedUrl = queryString.parseUrl(req.protocol + '://' + req.get('host') + req.originalUrl);
		parsedUrl.query.order = "latestthread"
		res.status(301).redirect(301, req.originalUrl.split("?").shift() + '?' + queryString.stringify(parsedUrl.query))
		return;
	}
	else if(req.query.order === "latest_reply") {
		let parsedUrl = queryString.parseUrl(req.protocol + '://' + req.get('host') + req.originalUrl);
		parsedUrl.query.order = "latestactive"
		res.status(301).redirect(301, req.originalUrl.split("?").shift() + '?' + queryString.stringify(parsedUrl.query))
		return;
	}

	// Search query
	let searchQuery = req.query.search || ""
	//Forces thread searches to order threads by latest thread
	if(searchQuery && req.query.order !== "latestthread"){
		let parsedUrl = queryString.parseUrl(req.protocol + '://' + req.get('host') + req.originalUrl);
		parsedUrl.query.order = "latestthread"
		res.redirect(req.originalUrl.split("?").shift() + '?' + queryString.stringify(parsedUrl.query))
		return;
	}

	var forum = parseInt(req.params.forum)

	let pagedata = {
		powForum: req.powForum,
		accInfo: req.account,
		forumData: {
			canPost: true,
		},
	}

	//Contains forum data
	let forumData = pagedata.forumData

	// Pagination
	forumData.currentPage = parseInt(req.query.page) || 1 //Default to page 1
	//Paginates by 15 rows. Multiply by specified page - 1 because database indexing starts at 0, not 1.
	let startingRow = 15 * (forumData.currentPage - 1)

	//Compensate for all categories view
	if(req.params.forum === "all"){
		pagedata.subcategory = {
			name: "All Subcategories",
			requiredRoles: null,
		}

		forumData.canPost = false
	}
	else {
		if(!Number.isInteger(forum)) return next("Invalid subcategory")
		pagedata.subcategory = await forumapi.GetSubcategory(forum)
	}
	
	//If the subcategory does not exist, redirect to the forum home
	if(!pagedata.subcategory && req.params.forum !== "all") return res.render("400", {reason: "This subcategory does not exist."})
	
	//Must have the necessary permission to post here
	if(!forumapi.permissionsCheck(pagedata.subcategory.requiredRoles, pagedata.accInfo.roles)) forumData.canPost = false

	//Sum of reputation
	var reputation = await accountAPI.SumReputation(req.session.uid)
	//Reputation must be greater than -10
	if(reputation<=-10) forumData.canPost = false

	// Gets threads
	//Fetches the latest threads if that order is selected
	if(req.query.order === "latestthread"){
		let filter = {
			title: new RegExp(other.EscapeRegex(searchQuery), 'i'),
		}

		if(req.params.forum !== "all")  filter.category = forum

		//Thread rows
		forumData.threads = await Threads.find(filter).sort({_id: -1}).skip(startingRow).limit(15).lean()

		//Determines how many pages there are for this result
		forumData.totalPages = await Threads.countDocuments(filter)
		.then(count => Math.ceil(count / 15))
	}
	//default order: latestactive
	//Fetches latest replies and puts their threads at the top. Note that this enables bumps/necroposting
	else { 
		let aggregateQuery = [
			{
				$sort: {
					_id: -1,
				}
			},
			{
				$group: {
					_id: '$tid',
					trid : { $first: '$_id' },
				}
			},
			{
				$sort: {
					trid: -1,
				}
			},
			{
				$skip: startingRow,
			},
			{
				$limit: 15,
			}
		]
		if(req.params.forum !== "all") aggregateQuery.unshift({ $match: { category: forum } })
		let latestActiveThreadIDs = await ThreadReplies
		.aggregate(aggregateQuery)
		forumData.threads = []
		for(let threadId of latestActiveThreadIDs){
			let thread = await Threads.findById(threadId).lean()
			if(!thread) {
				console.log(`Missing thread for tid ${JSON.stringify(threadId)}???`)
				continue
			}
			forumData.threads.push(thread)
		}

		//Determines how many pages there are for this result
		forumData.totalPages = await Threads.countDocuments({forum: forum === "all" ? /.+/ : forum})
		.then(count => Math.ceil(count / 15))
	}


	//Compiles the pinned threads if they're viewing the first page
	if(forumData.currentPage === 1){
		let pinnedThreads = await PinnedThreads.find()
		for(let i=pinnedThreads.length-1; i>-1; i--){
			let pinnedThread = await Threads.findById(pinnedThreads[i]._id).lean()
			if(pinnedThread && pinnedThread.category === forum) pinnedThreads[i] = Object.assign(pinnedThread, {pinned: true})
			else pinnedThreads.splice(i, 1)
		}
		//Prepend to the threads list. View will know to adjust thanks to the pinned property
		forumData.threads.unshift(...pinnedThreads)
	}

	// Get basic data for each thread
	for(let thread of forumData.threads){
		//Limits the title length
		if(thread.title.length > 90){
			thread.title = thread.title.substr(0,87) + '...'
		}

		//amount of replies on thread
		thread.replies = await ThreadReplies.countDocuments({tid: thread._id})
		//OP is not a reply, so subtract 1
		thread.replies--

		//Threads don't normally have 0 replies, but jic if someone manhandled the database
		if(thread.replies === -1) {
			forumData.threads.splice(i, 1) //So we don't display it in the threads list
			i-- //So the delete doesn't interrupt the loop
			continue //Move to the next loop
		}
		
		//Original post
		var firstReply = await ThreadReplies.findOne({tid: thread._id}).sort({_id: 1})

		//original poster's user id
		thread.OPUID = firstReply.uid

		//When the thread was created, aka the first reply's create date
		thread.date = firstReply.date
		
		//original poster's username
		thread.OPName = await accountAPI.GetUsername(thread.OPUID)

		if(thread && thread.replies > 0){
			//last replier's user id
			thread.LRUID = await ThreadReplies.findOne({tid: thread._id}).sort({_id: -1})
			.then(latestReply => latestReply.uid)
			
			//last replier's username
			thread.LRName = await accountAPI.GetUsername(thread.LRUID)
		}
	}

	pagedata.onlines = await onlinetracker.retrieve({req})

	res.render('pages/forum', pagedata);
});

module.exports = router;