var escape = require('escape-html');
var mongoose = require('mongoose');
const phraseblacklist = require('phrase-blacklist')
const stripCombiningMarks = require('strip-combining-marks')
const { RateLimiter } = require('limiter')
const { Configuration, OpenAIApi } = require("openai")

const io = require('../server').io
const accountAPI = require('./accountapi');
const rolesAPI = require('./rolesapi');
const notificationsAPI = require('./notifications')
const HandleCommand = require('./chatcommands')
const { ProcessMentions } = require('./pfapi');

const Messages = mongoose.model("Messages")
const Notifications = mongoose.model("Notifications")
const GeneralSettings = mongoose.model("GeneralSettings")

var configuration, openai = undefined
var lastOpenAIKey = process.env.OPENAI_API_KEY
function reloadOpenAI(){
	configuration = new Configuration({
		apiKey: process.env.OPENAI_API_KEY,
	})
	openai = new OpenAIApi(configuration)
	lastOpenAIKey = process.env.OPENAI_API_KEY
}
reloadOpenAI()

const rateLimitedChats = new RateLimiter({ tokensPerInterval: 10, interval: 5000, fireImmediately: true })

module.exports = async (socket) => {
	socket.uid = socket.request.session.uid

	//Reject connection if not logged in
	if (!socket.uid) return socket.disconnect()

	//Set per user rate limit
	//One message per second
	socket.rateLimiter = new RateLimiter({ tokensPerInterval: 2, interval: 1000, fireImmediately: true })

	//Conversations list
	//Grabs global chat info
	let lastGlobalChat = await Messages.findOne({ to: 0 }).sort({ "message._id": -1 }) || {}
	let conversations = [{
		account: {
			_id: 0,
			username: "Global Chat",
			profilepicture: "/images/avatars/anovatar.png",
		},
		content: lastGlobalChat.content
	}]
	//Build list of conversations this user is in
	await Messages.aggregate([
		{
			$match: {
				$or: [
					{ "to": socket.uid },
					{ "from": socket.uid, "to": { $ne: 0 } }
				]
			}
		},
		{ $sort: { _id: -1 } },
		{
			$group: {
				"_id": {
					"last_message_between": {
						$cond: [
							{ $gt: ["$to", "$from"] },
							{ $concat: [{ $toString: "$to" }, " and ", { $toString: "$from" }] },
							{ $concat: [{ $toString: "$from" }, " and ", { $toString: "$to" }] }
						]
					}
				}, "message": { $first: "$$ROOT" }
			}
		},
		{ $sort: { "message._id": -1 } },
		{ $limit: 25 },
	])
		.then(async senders => {
			//Compile data
			for (var i = 0; i < senders.length; i++) {
				//Get latest message from unique sender
				let { message } = senders[i]

				//Attach account metadata
				message.account = await accountAPI.fetchAccount(message.from === socket.uid ? message.to : message.from, {fallback: true, secure: true})

				//Add to list of conversations
				conversations.push(message)
			}
		})

	//For every existing conversation, join their room
	socket.join('globalchat')
	for (let i = 0; i < conversations.length; i++) {
		socket.join(socket.uid < conversations[i].account._id ? `${socket.uid}:${conversations[i].account._id}` : `${conversations[i].account._id}:${socket.uid}`)
	}

	socket.on("load-converstion", async (uid, ack) => {
		socket.viewingConvo = uid

		let conversation = {}

		//Fetch messages in this conversation
		if (uid == 0) conversation.messages = await Messages.find({ to: 0 }).sort({ _id: -1 }).limit(25).lean()
		else conversation.messages = await Messages.find({ $or: [{ from: uid, to: socket.uid }, { to: uid, from: socket.uid }] }).sort({ _id: -1 }).limit(25).lean()
		conversation.messages = conversation.messages.reverse()

		//Attach additional information
		for (let i = 0; i < conversation.messages.length; i++) {
			let message = conversation.messages[i]
			let chatterAcc = await accountAPI.fetchAccount(message.from, {fallback: true, secure: true})
			message.canDelete = await rolesAPI.isClientOverpowerTarget(socket.uid, message.from)
			message.sender = chatterAcc
			//Processes mentions
			message.content = await ProcessMentions(message.content)
		}

		if (uid == 0) conversation.account = { username: "Global Chat" }
		else {
			//Delete notifications made for the client and this conversation
			await Notifications.deleteMany({ type: "message", senderid: uid, recipientid: socket.uid })

			//Build account information
			let acc = await accountAPI.fetchAccount(uid, {fallback: true, secure: true})
			conversation.account = acc

			//Needed for when opening a brand new conversation
			socket.join(socket.uid < uid ? `${socket.uid}:${uid}` : `${uid}:${socket.uid}`)
		}

		ack(conversation)
	})

	//Handle messages
	socket.on('message', async (msg, ack) => {
		try {
			//Immediate rate limit
			if (await socket.rateLimiter.removeTokens(1) < 0) throw "You're sending messages too fast"

			//Fetch sender account details
			let sender = await accountAPI.fetchAccount(socket.uid, {secure: true})
			if('locked' in sender) throw "Your account has been locked"

			//System wide rate limit
			if (await rateLimitedChats.removeTokens(1) < 0) throw "Chat system has been throttled"

			//Sanitize recipient
			if (!("to" in msg) || !/\d+/.test(msg.to)) throw "Invalid recipient"
			msg.to = parseInt(msg.to)
			if (msg.to == socket.uid) throw "You can not message yourself"

			let room
			if (msg.to == 0) room = "globalchat"
			else room = socket.uid < msg.to ? `${socket.uid}:${msg.to}` : `${msg.to}:${socket.uid}`

			// DM pre-processing
			if (msg.to !== 0) {
				//Check if account exists
				let targetAccount = await accountAPI.fetchAccount(msg.to, {secure: true})
				if (!targetAccount) throw "Account does not exist"

				// Respect receiver's wishes for DM restrictions
				let generalSettings = await GeneralSettings.findById(targetAccount._id) || {}
				if (generalSettings.privateMessages === false) throw `${targetAccount.username} has disabled messages`
			}

			//Sanitize message content
			if (!msg.content) throw "Missing message"
			if (typeof msg.content !== "string") throw "Invalid message"
			msg.content = stripCombiningMarks(escape(msg.content))
			let ogMsg = msg.content

			//Check that the message is family friendly
			let isClean = phraseblacklist.isClean(msg.content.toLowerCase())
			if (typeof isClean === "string") throw `Message contains blacklisted phrase: ${isClean}`

			// Reputation must be greater than -2
			//Sum of reputation
			var reputation = await accountAPI.SumReputation(socket.uid)
			if (reputation <= -2) throw "Your reputation is too low"

			//Enforce character length
			//Patrons, VIPs, and users with 10+ rep get an increased character limit
			var characterLimit = await rolesAPI.isSupporter(socket.uid) || reputation > 10 ? 500 : 1500;
			if ((msg.content.match(/\w/g) || "").length < 2 || msg.content.length > characterLimit) throw `Message must be 2-${characterLimit} characters long`
			msg.content = msg.content.trim()

			//Check if the user's email is verified
			if (!await accountAPI.emailVerified(socket.uid)) throw "Please verify your email first!"

			//Process auto response
			let autoResponse
			if (msg.to === 0) {
				//Handle command
				if (msg.content.startsWith('/')) {
					autoResponse = await HandleCommand(msg.content)
					.catch(e => {
						if (typeof e === "string") throw e
						else console.error(e)
					})
				}
				//Respond with AI (Designed with global chat in mind only. Not DM)
				else if (ogMsg.toLowerCase().startsWith("@bot ")) {
					if(!process.env.OPENAI_API_KEY) throw "AI chat bot is not configured"

					//Handles when OpenAI auth changed
					if(process.env.OPENAI_API_KEY !== lastOpenAIKey) reloadOpenAI()

					//Premium and moderator accounts only to prevent excessive billing
					if (!await rolesAPI.isPatron(sender.roles) && !await rolesAPI.isModerator(sender.roles)) 
						throw `Only <a href="/upgrade">premium members</a> can use AI chat`

					//Grabs AI chat history from the past 15 minutes
					let aiChatHistory = await Messages.find({$or: [{from: socket.uid}, {from: 1, to: 0}], content: new RegExp(`^@(bot|${sender.username}) `, "i"), time: {$gte: new Date() - 1000*60*5}}).limit(6).sort({_id: -1}).lean()
					aiChatHistory = aiChatHistory.map(chat => {
						return {
							role: chat.from === 1 ? "assistant" : "user",
							//Slice removes the "@username "
							content: chat.from === 1 ? chat.content.slice(sender.username.length) : chat.content.slice(5)
						}
					})

					let aiResponse = await openai.createChatCompletion({
						model: "gpt-4o-mini",
						messages: [
							...aiChatHistory,
							{role: "user", content: ogMsg.slice(5)}
						],
						temperature: 0.5,
						max_tokens: 100,
						top_p: 1.0,
						frequency_penalty: 0.5,
						presence_penalty: 0.0,
						user: socket.uid.toString(),
					})
					.catch(e => {
						e = e.toString()

						if (e == "Request failed with status code 429") throw "Rate limited..."
						else {
							console.error(e)
							throw "Unhandled error occured"
						}
					})

					if (aiResponse) autoResponse = `@${sender.username} ${escape(aiResponse.data.choices[0].message.content)}`
				}
			}

			//Save message to database
			let message = await new Messages({
				time: Date.now(),
				from: socket.uid,
				to: msg.to,
				content: msg.content,
			}).save()


			//Processes mentions
			message.content = await ProcessMentions(message.content)

			//Send live message
			await io.in(room).emit("message", {
				...message.toObject(),
				sender,
			})

			// Send DM notification to message receiver if they're not online
			let connections = await io.in(room).fetchSockets()
			let targetViewingConvo = false
			for (let targetSocket of connections.filter(connection => connection.uid === msg.to)){
				targetViewingConvo = targetSocket.viewingConvo == socket.uid
				if(targetViewingConvo) break
			}
			if (msg.to !== 0 && !targetViewingConvo) {
				await notificationsAPI.SendNotification({ 
					type: "message", 
					recipientid: msg.to, 
					senderid: socket.uid,
					message: msg.content
				})
			}

			//Sends auto response if any
			if (autoResponse) {
				let message = await new Messages({
					time: Date.now(),
					from: 1,
					to: 0,
					content: autoResponse,
				}).save()

				let sender = await accountAPI.fetchAccount(1, {secure: true})
				let botResponse = {
					sender,
					...message.toObject(),
				}

				await io.in(room).emit("message", botResponse)
			}

			ack({
				success: true,
			})
		}
		catch (e) {
			ack({
				success: false,
				reason: typeof e === "string" ? e : "Unknown server error"
			}
			)

			typeof e !== "string" && console.error(e)
		}
	})

	//Handle delete chat
	socket.on('delete-message', async (msg, ack) => {
		let autoResponse = {}
		try {
			let { id } = msg
			if (!id || !/\d+/.test(id)) throw "Invalid chat id"

			if (!socket.uid) throw "You're not logged in"

			//Find message
			let message = await Messages.findOne({ _id: id })
			if (!message) throw "Message does not exist"
			if (!message.from !== socket.uid && !await rolesAPI.isClientOverpowerTarget(socket.uid, message.from))
				throw "You lack permissions to delete this message"

			//Determine room
			let room
			if (message.to == 0) room = "globalchat"
			else room = socket.uid < message.to ? `${socket.uid}:${message.to}` : `${message.to}:${socket.uid}`

			//Instructs connections to delete the message
			io.in(room).emit("delete-message", {
				id: message._id
			})

			//Deletes message from database
			await message.remove()

			//Note: This does not consider undo notifications if this chat triggered one

			autoResponse.success = true
		}
		catch (e) {
			autoResponse.reason = typeof e === "string" ? e : "Unknown server error"
			typeof e !== "string" && console.error(e)
		}
		ack(autoResponse)
	})
}