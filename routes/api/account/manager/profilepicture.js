const router = require('express').Router()
var formidable = require('formidable')
const path = require('path')
const fs = require('fs')
const rolesAPI = require("../../../../my_modules/rolesapi")
const jimp = require("jimp")
const { execFile } = require('child_process')
const gifsicle = require('gifsicle');
const webp = require('webp-converter')
const isAnimated = require('is-animated')
const mongoose = require('mongoose')

const buildpfp = require('../../../../my_modules/buildpfp')
const accountAPI = require('../../../../my_modules/accountapi')

var avatarspath = path.resolve('./public/images/avatars') // relative to server.js

const Accounts = mongoose.model('Accounts')

// update account profile picture
router.post('/', async (req, res, next) => {
	try{
		let response = {success: false}

		//Only allow logged in users
		if(!req.session.uid) throw "Not logged in"

		var account = await accountAPI.fetchAccount(req.session.uid)
		if(!account) throw "Account doesn't exist"

		var canUseGIF = await rolesAPI.isPatron(account.roles) || await rolesAPI.isModerator(account.roles)

		//Will be set later
		var fileName;

		await new Promise(async function(resolve, reject) {
			var form = new formidable.IncomingForm()
			form.maxFileSize = 2 * 1000 * 1000 // 2000 megabytes
			form.maxFields = 1; //Only parse 1 file
			
			form = form.parse(req)

			form.onPart = function (part) {
				// Validate file type
				// Allowed ext
				const filetypes = /jpeg|jpg|png|gif|webp/;
				// Check ext
				const extname = filetypes.test(path.extname(part.filename).toLowerCase());
				// Check mime
				const mimetype = filetypes.test(part.mime);

				if(!extname || !mimetype){
					//Images only!
					form._error("Invalid file type")
				} 
				//Prevent non-patrons from using .gif as a PFP
				else if(
					(part.mime === "image/gif" || path.extname(part.filename).toLowerCase() === ".gif") && 
					!canUseGIF
				) form._error("Only premium/patron accounts can use .gif files as their avatar.");
				//Valid file type, so lets process it
				else form.handlePart(part);
			}

			form.on('fileBegin', function(name, file) {
				// Where to download the file
				var ext = path.extname(file.name)
				var uniqid = new Date().getTime()
				fileName = `${req.session.uid}_${uniqid}${ext}`
				file.path = path.join(avatarspath, fileName)
			})
			//Finished downloading 'files'
			form.on('end', async function() {
				if(fileName){
					//If user has an uploaded PFP, delete it
					accountAPI.deleteUploadedProfilePicture(account._id)
		
					//Path to the newly uploaded file
					var filePath = path.join(avatarspath, fileName)

					//Jimp does not support webp. Convert webp to jpeg
					if(path.extname(filePath).toLowerCase() === ".webp"){
						if(isAnimated(fs.readFileSync(filePath))) reject("Animated .webp is not supported")

						fileName = fileName.replace(".webp", ".jpeg")
						let newFilePath = path.join(avatarspath, fileName)

						await webp.dwebp(filePath, newFilePath, "-o")
						if(fs.existsSync(filePath)) fs.unlinkSync(filePath)

						filePath = newFilePath
					}
		
					//Resizes to 160px and square crops .png .jpeg .jpg
					if(path.extname(filePath).toLowerCase() !== ".gif"){
						await jimp.read(filePath)
						.then(file => {
							//Get square dimensions
							const edgeLength = Math.min(file.bitmap.width, file.bitmap.height);
							const xOffset = (file.bitmap.width - edgeLength)/2;
							const yOffset = (file.bitmap.height - edgeLength)/2;
		
							return file
							.crop(xOffset, yOffset, edgeLength, edgeLength)
							.resize(160, 160) // resize
							.write(filePath); // save
						})
					}
					//Resizes .gif to 160px
					else{
						execFile(gifsicle, ['--resize', '160x160', '-o', filePath, filePath], err => {
							if (err) throw err;
						});
					}
		
					//Update account row's pfp value
					await Accounts.updateOne({_id: req.session.uid}, {profilepicture: fileName})

					response.newProfilePicture = buildpfp(fileName)
		
				}
				//No file was attached. Assume profile picture delete request
				else {
					accountAPI.deleteUploadedProfilePicture(account._id)
		
					//Update account row's pfp value
					await Accounts.updateOne({_id: req.session.uid}, {profilepicture: null})

					response.newProfilePicture = buildpfp()
				}

				response.success = true
				resolve()
			})
			form.on('error', function(err) {
				reject(err || "Couldn't handle the file")
			})
		})

		res.json(response)
	}
	catch(e){
		next(e)
	}
});

module.exports = router;