const fetch = require('node-fetch')

//Google Captcha Wrapper
class Captcha {
	//Google reCaptcha v2; Image test based
	captcha(grecaptcharesponse, remoteip) {
		return new Promise( ( resolve, reject ) => {
			//Captcha is annoying in development...
			if(process.env.NODE_ENV === "development") return resolve(true)

			//Default to successful captcha if an API key was never supplied
			if(!process.env.CAPTCHA_APIKEY) return resolve(true)

			//Missing fields, so dont bother wasting network resources
			if(!grecaptcharesponse || !remoteip) return resolve(false)
			
			fetch(`https://challenges.cloudflare.com/turnstile/v0/siteverify`, {
				method: 'POST',
				headers: {
					'Content-Type': "application/json"
				},
				body: JSON.stringify({
					secret: process.env.CAPTCHA_APIKEY,
					response: grecaptcharesponse,
					remoteip,
				})
			})
			.then(res => res.json())
			.then(res => {
				if(res['error-codes']?.length > 0 && !res['error-codes'].includes('invalid-input-response')) reject(res)
				res.success ? resolve(true) : resolve(false)
			})
		})
	}
}

module.exports = new Captcha();