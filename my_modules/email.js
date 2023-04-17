module.exports = {
	//Wraps mailgun sender into promise
	SendMail: (emaildata) => {
		var mailgun = require("mailgun-js")({apiKey: process.env.MAILGUN_APIKEY, domain: process.env.MAILGUN_DOMAIN});
		
		return new Promise( ( resolve, reject ) => {
			//Sends
			mailgun.messages().send(emaildata, function (error, body) {
				if (error) reject(error);
				resolve();
			});
		})
		.catch(e => {console.log("Failed to send email1: ", e)})
	},

	//Just the bare minimum to sending an email
	SendBasicEmail: (to, subject, body) => {
		let emaildata = {
			from: `"noreply" <${process.env.MAILGUN_NOREPLY_ADDRESS}>`,
			to: to,
			subject: subject,
			text: body
		};

		return module.exports.SendMail(emaildata)
	},

	isMajorEmailDomain: (emailAddress) => {
		const whitelist = ["gmail.com", "aol.com", "outlook.com", "yahoo.com", "icloud.com", "mozilla.com", 
		"proton.com", "hotmail.com", "zoho.com", "live.com", "comcast.net"]

		//Grabs the domain part of an email address. (eg. mail@domain.com = domain.com)
		var ind = emailAddress.indexOf("@");
		var sliced = emailAddress.slice((ind+1),emailAddress.length);

		//Checks if the domain is whitelisted
		return whitelist.includes(sliced)
	}
}