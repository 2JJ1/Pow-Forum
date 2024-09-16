const mongoose = require("mongoose")

const ForumSettings = mongoose.model("ForumSettings")

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
		//.catch(e => {console.log("Failed to send email1: ", e)})
	},

	//Just the bare minimum to sending an email
	SendBasicEmail: (to, subject, body) => {
		let emaildata = {
			from: `"noreply" <noreply@${process.env.MAILGUN_DOMAIN}>`,
			to: to,
			subject: subject,
			text: body
		};

		return module.exports.SendMail(emaildata)
	},

	//Formatted email with branding and as html
	sendEmail: async (options) => {
		let {recipient, subject, body, viewURL} = options;

		let forumName = (await ForumSettings.findOne({type: "name"})).value;

		let html = `
			<div style="text-align: center;">
				<!-- <img src="#" alt="Forum Logo" style="max-width: 100px;"/> -->
				<h1>${forumName}</h1>
			</div>
			<div>
				<p>Hello ${recipient.username},</p>
				<br>
				<div>${body}</div>
				<br>
				<a href="${viewURL}" style="background-color: #3498DB; color: white; padding: 7px 12px; border-radius: 8px; text-decoration: none;">View</a>
				<br>
			</div>
			<br>
			<div style="color: lightgrey;">
				<p>Do not reply to this auto-generated email as it is unmonitored an uninteractve.</p>
				<p>If you no longer wish to receive these emails, you may manage notification settings <a href="${process.env.FORUM_URL}/manager/settings">here</a>.</p>
			</div>
		`;

		let emaildata = {
			from: `"noreply" <noreply@${process.env.MAILGUN_DOMAIN}>`,
			to: recipient.email,
			subject: `${subject} - ${forumName}`,
			html
		};

		return module.exports.SendMail(emaildata)
	},

	isMajorEmailDomain: (emailAddress) => {
		const whitelist = ["gmail.com", "aol.com", "outlook.com", "yahoo.com", "icloud.com", "mozilla.com", 
		"protonmail.com", "proton.me", "hotmail.com", "zoho.com", "live.com", "comcast.net"]

		//Grabs the domain part of an email address. (eg. mail@domain.com = domain.com)
		var ind = emailAddress.indexOf("@");
		var sliced = emailAddress.slice((ind+1),emailAddress.length);

		//Checks if the domain is whitelisted
		return whitelist.includes(sliced)
	}
}