const router = require('express').Router()
var escape = require('escape-html')
var sanitizeHtml = require('sanitize-html')
const phraseblacklist = require('phrase-blacklist')
const jsdom = require("jsdom");
const mongoose = require("mongoose")

const stripCombiningMarks = require('strip-combining-marks')
const other = require('../../../../my_modules/other')
const rolesAPI = require('../../../../my_modules/rolesapi')
const accountAPI = require('../../../../my_modules/accountapi')

const ForumSettings = mongoose.model("ForumSettings")
const Accounts = mongoose.model("Accounts")

const { JSDOM } = jsdom;

// update account info tab
router.post('/', async (req, res, next) => {
	try{
		let response = {success: false}

		//Only allow logged in users
		if(!req.session.uid)
			throw "Not logged in"
		
		if(!(Object.keys(req.body).length > 0))
			throw "No change request made"
		
		//Contains all data to update in database
		let keyvalues = {
			//Incase we want a delete query
			$unset: {}
		}
		
		// Account Info
		if(req.body.username){
			let username = req.body.username
			
			if(!(username.length >= 3 && username.length <= 15)){
				throw "Username must be 3-15 characters in length"
			}
			
			if(!other.isAlphaNumeric_(username)){
				throw "Only letters, numbers, and underscore is allowed"
			}

			let isClean = phraseblacklist.isClean(username.toLowerCase())
			if (typeof isClean === "string") throw `New username contains a banned phrase: ${isClean}`

			//Checks if username isnt used
			let existingAccount = await accountAPI.fetchAccount(username)
			if(existingAccount) throw "Username is taken"
			
			//Only patrons and moderators can change their usernames
			let isPremium = await rolesAPI.isPatron(req.session.uid)
			let isModerator = await rolesAPI.isModerator(req.session.uid)
			if(!isPremium && !isModerator) throw "Not a premium member"
			
			//No early exit, so pass
			//No need to escape since its been sanitized, but better safe than sorry
			keyvalues.username = escape(username)
		}

		if("intro" in req.body){
			let {intro} = req.body
			if(!intro) Object.assign(keyvalues.$unset, {biography: 1})
			else {
				if(intro.length > 200) throw "Intro has too many characters"

				let isClean = phraseblacklist.isClean(intro.toLowerCase())
				if (typeof isClean === "string") throw `Your intro contains a banned phrase: ${isClean}`

				keyvalues.biography = escape(stripCombiningMarks(intro))
			}
		}
		
		if("alias" in req.body){
			let {alias} = req.body
			if(!alias) Object.assign(keyvalues.$unset, {alias: 1})
			else {
				if(alias.length > 25) throw "Title has too many characters"

				let isClean = phraseblacklist.isClean(alias.toLowerCase())
				if (typeof isClean === "string") throw `Your title contains a banned phrase: ${isClean}`

				keyvalues.alias = escape(stripCombiningMarks(alias))
			}
		}

		// Social Media
		let {medias} = await accountAPI.fetchAccount(req.session.uid)
		
		if("youtube" in req.body){
			let {youtube} = req.body
			if(!youtube) delete medias.youtube
			else {
				if(!youtube.match(/^(https:\/\/(www\.)?youtu((\.be)|(be\..{2,5}))\/(((user)|(channel)|(c))\/\w+|@?\w{3,60}))/g)) throw 'Invalid YouTube channel link'
				medias.youtube = escape(youtube)
			}
		}
		if("github" in req.body){
			let {github} = req.body
			if(!github) delete medias.github
			else {
				if(!github.match(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i)) throw 'Invalid GitHub username'
				medias.github = escape(github)
			}
		}
		if("discordtag" in req.body){
			let {discordtag} = req.body
			if(!discordtag) delete medias.discordtag
			else {
				if(!/^[a-z0-9](?!.*[._]{2})[a-z0-9._]{0,30}[a-z0-9]$/.test(discordtag)) throw "Invalid Discord username"
				medias.discordtag = escape(discordtag)
			}
		}
		if("website" in req.body){
			let {website} = req.body
			if(!website) delete medias.website
			else {
				if(!other.isSecureURL(website)) throw "Invalid website link"
				medias.website = escape(website)
			}
		}
		if("twitter" in req.body){
			let {twitter} = req.body
			if(!twitter) delete medias.twitter
			else {
				if(!twitter.match(/^@?(\w){1,15}$/)) throw "Invalid Twitter handle"
				//Twitter handles start with @, but remove it for sanitization
				if(twitter.substr(0,1) === "@") twitter = twitter.substr(1);
				medias.twitter = escape(twitter)
			}
		}
		if("facebook" in req.body){
			let {facebook} = req.body
			if(!facebook) delete medias.facebook
			else {
				if(!facebook.match(/^(https:\/\/)(www\.)?facebook\.com\//)) throw "Invalid Facebook URL"
				medias.facebook = escape(facebook)
			}
		}

		// Forum settings
		if("signature" in req.body) {
			let {signature} = req.body
			if(!signature) Object.assign(keyvalues.$unset, {signature: 1})
			else {
				if(signature.length > 1000) throw "Signature contains too much HTML data"

				//Sanitize HTML to prevent unauthorized tags (Like <script> to prevent xss)
				let sanitizedSignatureHTML = sanitizeHtml(signature, {
					allowedTags: [ 'p', 'a', 'i', 'em', 'strike', 'hr', 'br', 'div', 'span' ],
					allowedAttributes: {
						"a": [ 'href', 'name', 'target' ],
						"span": ['style'],
						"p": ["style"],
					},
					allowedSchemes: [ 'https', 'mailto' ], //Prevents vulnerabilities like opening apps with their scheme
					allowedSchemesAppliedToAttributes: [ 'href', 'src' ],
					allowedStyles: {
						'*': {
						// Match HEX and RGB
						'color': [/^#(cd201f|e11d48|c0392b|1abc9c|2ecc71|3498db|2980b9|e67e22|f1c40f|6d28d9|9333ea|c026d3|34495e|795548)$/],
						'text-align': [/^left$/, /^right$/, /^center$/],
						'text-decoration': [/^(underline|line-through)$/],
						}
					},
					exclusiveFilter: function(frame) {
						//Remove empty text nodes
						return !frame.text.trim();
					}
				})

				//More sanitization to check if the signature is too long or short
				let dom = new JSDOM(sanitizedSignatureHTML)
				let textContent = dom.window.document.body.textContent
				if(textContent.length < 3 || textContent.length > 200) throw "The signature must be between 3-200 characters"
				//Counts line breaks - Bypassable by putting all HTML in one line
				else if ((textContent.match(/\n/g) || '').length+1 > 3) throw "The signature must have less than 3 lines"

				let isClean = phraseblacklist.isClean(textContent.toLowerCase())
				if (typeof isClean === "string") throw `Your signature contains a banned phrase: ${isClean}`

				//Adds nofollow to unwhitelisted links. Hopefully will discourage advertisement bots.
				let allowedFollowDomains = (await ForumSettings.findOne({type: "allowedFollowDomains"}) ?? {value: []}).value
				Array.from(dom.window.document.getElementsByTagName("a")).forEach(a => {
					let href = a.getAttribute("href")
					let hostname
					try {
						hostname = new URL(href).hostname
					} catch(e){}
					//No hostname? Probably a / route to redirect on the same site
					if(!hostname) return
					//Adds nofollow
					if(allowedFollowDomains.indexOf(hostname) === -1) a.setAttribute("rel", "noreferrer nofollow")
				})
				keyvalues.signature = dom.serialize()
			}
		}
		
		keyvalues.medias = JSON.stringify(medias)

		if(!(Object.keys(keyvalues).length > 0)) throw "Includes invalid field"
		
		//Updates account
		await Accounts.updateOne({_id: req.session.uid}, keyvalues)
		
		response.success = true
		res.json(response)
	}
	catch(e){
		next(e)
	}
})

module.exports = router;