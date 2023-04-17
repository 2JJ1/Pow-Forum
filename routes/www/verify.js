const router = require('express').Router()
const mongoose = require('mongoose')

const Accounts = mongoose.model("Accounts")
const Logs = mongoose.model("Logs")

// 	/verify
router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account
        }
        
        var token = req.query.token

        if(!req.session.uid) throw "You must be logged into the account you're trying to verify"

        let {emailVerification} = await Accounts.findById(req.session.uid, 'emailVerification')

        if(!emailVerification) throw "Your account is already verified"

        //What account is the token associated with
        let tokensAccount = await Accounts.findOne({"emailVerification.token": token})

        if(!tokensAccount) throw "Invalid token. Check if the email was already verified, otherwise send a new verification request from the security manager page."

        let uid = tokensAccount._id
        
        if(req.session.uid !== uid) throw "You must be logged into the account you're trying to verify"

        //Delete the verification request to assume account is verified
        tokensAccount.emailVerification = undefined
        await tokensAccount.save()

        pagedata.message = "Your account's email is now verified. The token has been deleted."

        //Log to database
        await Logs({
            uid,
            action: "verified_email",
            description: tokensAccount.email,
            date: new Date() //Current date
        }).save()
        
        res.render('pages/verify', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;