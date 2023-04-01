const mongoose = require('mongoose')

module.exports = mongoose.model("PasswordResetSessions", {
    //token
    _id: String,
    uid: Number,
    expiredate: Date,
})