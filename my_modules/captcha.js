const https = require("https");
const fetch = require('node-fetch')

//Google Captcha Wrapper
class Captcha {
	//Google reCaptcha v2; Image test based
	captchaV2(grecaptcharesponse, remoteip) {
		return new Promise( ( resolve, reject ) => {
			//Captcha is annoying in development...
			//if(process.env.NODE_ENV === "development") return resolve(true)

			//Default to successful captcha if an API key was never supplied
			if(!process.env.CAPTCHAV2_APIKEY) return resolve(true)

			//Missing fields, so dont bother wasting network resources
			if(!grecaptcharesponse || !remoteip) return resolve(false)
			
			fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHAV2_APIKEY}&response=${grecaptcharesponse}&remoteip=${remoteip}`, {
				method: 'POST',
			})
			.then(res => res.json())
			.then(res => res.success ? resolve(true) : resolve(false))
			.catch(e => reject(e))
		})
	}
	//Google reCaptcha v3; Invisible & score based
	captchaV3(grecaptcharesponse, remoteip) {
		return new Promise( ( resolve, reject ) => {
			//Captcha is annoying in development...
			//if(process.env.NODE_ENV === "development") return resolve(true)

			//Default to successful captcha if an API key was never supplied
			if(!process.env.CAPTCHAV3_APIKEY) return resolve(true)

			//Missing fields, so dont bother wasting network resources
			if(!grecaptcharesponse || !remoteip) return resolve(false)
			
			fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHAV3_APIKEY}&response=${grecaptcharesponse}&remoteip=${remoteip}`, {
				method: 'POST',
			})
			.then(res => res.json())
			/*{
				"success": true|false,      // whether this request was a valid reCAPTCHA token for your site
				"score": number             // the score for this request (0.0 - 1.0)
				"action": string            // the action name for this request (important to verify)
				"challenge_ts": timestamp,  // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
				"hostname": string,         // the hostname of the site where the reCAPTCHA was solved
				"error-codes": [...]        // optional
			}*/
			.then(res => res.score >- 0.5 ? resolve(true) : resolve(false))
			.catch(e => reject(e))
		})
	}
}

module.exports = new Captcha();