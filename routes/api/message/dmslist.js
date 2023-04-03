const router = require('express').Router()
const mongoose = require("mongoose")

const rolesAPI = require('../../../my_modules/rolesapi')
const accountAPI = require('../../../my_modules/accountapi')

const Messages = mongoose.model("Messages")

// 	/api/message/dmslist

router.get('/', async (req, res) => {
    let conversations = [{
        account: {
            _id: 0,
            username: "Global Chat",
            profilepicture: "/images/avatars/anovatar.png",
        },
        ...await Messages.findOne({to: 0}).sort({_id: -1}).lean()
    }]

	//Build list of people you have a conversation with
	var senders = await Messages.aggregate([
		{
			$match: {$or: [
				{"to": req.session.uid}, 
				{"from": req.session.uid, "to": {$ne: 0}}
			]}
		},
		{$sort: {_id: -1}},
		{
			$group:{"_id": {
				"last_message_between":{
					$cond:[
						{$gt: ["$to", "$from"]},
						{$concat: [{$toString: "$to"}, " and ", {$toString: "$from"}]},
						{$concat: [{$toString: "$from"}, " and ", {$toString: "$to"}]}
					]
				}
				},"message":{$first:"$$ROOT"}
			}
		},
		{$sort: {"message._id": -1}},
		{$limit: 25},
	])

	//Compile data
	for(var i=0; i<senders.length; i++){
		//Get latest message from unique sender
		let {message} = senders[i]

		//Attach account metadata
		let account = await accountAPI.fetchAccount(message.from === req.session.uid ? message.to : message.from, {fallback: true, secure: true})
		message.account = account
		message.account.highestRole = await rolesAPI.GetHighestRole(message.account.roles)

		//Add to list of conversations
		conversations.push(message)
	}
	
    res.json(conversations)
});

module.exports = router;