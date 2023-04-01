const mongoose = require('mongoose')

module.exports = mongoose.model("AltAccounts", {
    //uid
    _id: Number,
    matches: Object
})