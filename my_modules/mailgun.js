//Promise based Mailgun wrapper

class Mailgun {
	//Wraps mail sender into promise
	SendMail(emaildata) {
		var mailgun = require("mailgun-js")({apiKey: process.env.MAILGUN_APIKEY, domain: process.env.MAILGUN_DOMAIN});
		
		return new Promise( ( resolve, reject ) => {
			//Sanitize
			if(!this.isEmailCompatible(emaildata.to)) reject("Email not compatible")

			//Sends
			mailgun.messages().send(emaildata, function (error, body) {
				if (error) reject(error);
				resolve();
			});
		})
		.catch(e => {console.log("Failed to send email1: ", e)})
	}

	//Just the bare minimum to sending an email
	SendBasicEmail(to, subject, body) {
		let emaildata = {
			from: `"noreply" <${process.env.MAILGUN_NOREPLY_ADDRESS}>`,
			to: to,
			subject: subject,
			text: body
		};

		return this.SendMail(emaildata)
	}

	//Checks if mailgun can send an email to this address
	//I'm using a shared ip and it has a bad reputation unforunately.
	//Because of the bad reputation, email providers like Outlook and Yahoo block me
	isEmailCompatible(address){
		//Grabs the domain part of an email address. (eg. mail@domain.com = domain.com)
		var ind = address.indexOf("@");
		var sliced = address.slice((ind+1),address.length);
		//If the domain is blacklisted, its imcompatible(false). Compatible(true) otherwise
		var blackList = /outlook.com|yahoo.com/
		return !blackList.test(sliced)
	}
}

module.exports = new Mailgun();