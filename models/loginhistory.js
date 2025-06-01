const mongoose = require('mongoose')

module.exports = mongoose.model("LoginHistories", {
    uid: {
        type: Number,
        index: true,
    },
    ip: {
        type: String,
        index: true,
    },
    date: Date,
})