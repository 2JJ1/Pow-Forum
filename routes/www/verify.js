const router = require('express').Router()
const mongoose = require('mongoose')

const accountAPI = require('../../my_modules/accountapi')

const PendingEmailVerifications = mongoose.model("PendingEmailVerifications")
const Logs = mongoose.model("Logs")

// 	/verify
router.get('/', async (req, res) => {
	let pagedata = {
		powForum: req.powForum,
		accInfo: req.account
    }
    
    var token = req.query.token

    if(!req.session.uid) return res.status(400).render('400', {reason: "You must be logged into the account you're trying to verify"})

    let pendingVerification = await PendingEmailVerifications.findById(req.session.uid)
    if(!pendingVerification) return res.status(400).render('400', {reason: "Your account is already verified"})

    var verificationDoc = await PendingEmailVerifications.findOne({token})

    if(verificationDoc){
        let uid = verificationDoc._id
        
        if(req.session.uid !== uid) return res.status(400).render('400', {reason: "You must be logged into the account you're trying to verify"})

        //Delete the verification request to assume account is verified
        await PendingEmailVerifications.deleteOne({_id: uid})

        pagedata.message = "Your account's email is now verified. The token has been deleted."

        // Add to logs
        //Get email to log
        let { email } = await accountAPI.fetchAccount(uid)

        //Log to database
        await Logs({
            uid,
            action: "verified_email",
            description: email,
            date: new Date() //Current date
        }).save()
    } else{
        pagedata.message = "Invalid token. Check if the email was already verified, otherwise send a new verification request from the security manager page."
    }
	
    res.render('pages/verify', pagedata);
});

module.exports = router;