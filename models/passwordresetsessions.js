const mongoose = require('mongoose')

module.exports = mongoose.model("PasswordResetSessions", {
    //user id
    _id: Number,
    token: {
        type: String,
        index: true,
        unique: true,
    },
    expireDate: Date,
})