const mongoose = require('mongoose')

module.exports = mongoose.model("PendingEmailVerifications", {
    //uid
    _id: Number,
    token: {
        type: String,
        index: true,
    },
    lastsent: Date,
})