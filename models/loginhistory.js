const mongoose = require('mongoose')

module.exports = mongoose.model("LoginHistories", {
    uid: {
        type: Number,
        index: true,
    },
    ip: String,
    date: Date,
})