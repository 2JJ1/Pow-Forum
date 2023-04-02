const speakeasy = require('speakeasy')
var QRCode = require('qrcode')
const mongoose = require('mongoose')

const ForumSettings = mongoose.model("ForumSettings")
const TFAs = mongoose.model("TFAs")

class TFA {
    // Enables 2FA for account and returns QR code
    async enable(uid){
        // Returns an object with secret.ascii, secret.hex, and secret.base32.
        var secret = speakeasy.generateSecret({
            name: (await ForumSettings.findOne({type: "title"})).value
        })

        // Store this on server to verify against the client
        var secret2fakey = secret.ascii;
        //Just in case a record exists
        await TFAs.deleteOne({_id: uid})
        //Saves TFA record
        await new TFAs({
            _id: uid,
            secret: secret2fakey,
            verified: 0,
        }).save()

        // Generate QR code
        return await new Promise(function(resolve, reject) {
            QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {
                if(err) reject(err)

                //Example HTML: '<img src="' + data_url + '">'
                resolve(data_url)
            });
        })
    }

    //Gets account secret then checks 2FA
    async verify(uid, userToken, time){
        //Removes spaces from code. Speakeasy doesn't work with spaces even though Google Auth shows them with spaces
        if(typeof userToken === "string") userToken = userToken.split(' ').join('')

        var secret2FAKey = await TFAs.findById(uid)
        .then(res => {
            if(res) return res.secret
            else throw "2FA record does not exist"
        })

        // Check the token against the secret
        var opts = { 
            secret: secret2FAKey,
            encoding: 'ascii',
            token: userToken
        }
        var verified = speakeasy.totp.verify(opts) //First check with current time
        if(!verified && time){ //Re-checks with custom time if current time check fails
            //Time can only be 6 hours old. This should be much more than long enough for any situation
            var expireDate = new Date(time * 1000)
            expireDate.setHours(expireDate.getHours() + 6);
            if(expireDate < new Date()) {
                console.warn(new Error(`UID#${uid} reached 2FA custom time expired`))
                throw "Time check too old. Is your time correct?"
            }

            opts.time = time
            verified = speakeasy.totp.verify(opts)
        } 

        return verified === true
    }
}

module.exports = new TFA();