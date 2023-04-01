const mongoose = require('mongoose')

module.exports = mongoose.model("Logs", {
    uid: Number,
    action: String,
    description: String,
    date: Date,
})