const express = require('express');
const router = express.Router();
const mongoose = require("mongoose")

const GeneralSettings = mongoose.model("GeneralSettings")
const NotificationSettings = mongoose.model("NotificationSettings")

// /manager/security

router.get('/', async (req, res, next) => {
    try {
        let pagedata = {
            powForum: req.powForum,
            accInfo: req.account,
            generalsettings: await GeneralSettings.findById(req.session.uid) || {},
            notificationSettings: await NotificationSettings.findById(req.session.uid) || {},
        }

        if(!req.session.uid) return res.status(400).redirect('/login')

        res.render('pages/manager/settings', pagedata)
    }
    catch(e){
        next(e)
    }
})

module.exports = router;