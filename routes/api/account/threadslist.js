const router = require('express').Router()
const mongoose = require('mongoose')

const Threads = mongoose.model('Threads')
const ThreadReplies = mongoose.model('ThreadReplies')

// 	/api/account/threadslist

// Get list of threads a user has created
router.get('/', async (req, res) => {
	let response = {success: false}

	try {
		//Determine who's threads to search for
		let queryfor = req.query.uid || req.session.uid //Request client's data
		
		//Pagination handler
		let startingRow = 0
		if(req.query.page){
			if(parseInt(req.query.page) === NaN) throw "Invalid page number"

			//Paginates by 15 rows. 
			//Multiply by specified page - 1 because database indexing starts at 0, not 1.
			startingRow = (startingRow+15) * (req.query.page - 1)
		}
		
		//How many threads do they have
		response.totalthreads = await Threads.countDocuments({uid: queryfor})
		
		//Gets page of threads
		response.threads = await Threads.find({uid: queryfor}).skip(startingRow).limit(15).lean()
		
		//Add additional data
		for (let thread of response.threads){
			//amount of replies on thread
			//OP is not a reply, so subtract 1
			thread.replies = await ThreadReplies.countDocuments({tid: thread._id}) - 1
		}

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