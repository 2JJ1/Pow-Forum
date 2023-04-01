const mongoose = require('mongoose')

module.exports = mongoose.model("GeneralSettings", {
    _id: Number,
    privateMessages: Boolean,
})