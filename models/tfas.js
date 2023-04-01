const mongoose = require('mongoose')

module.exports = mongoose.model("TFAs", {
    //uid
    _id: Number,
    secret: String,
    verified: Number,
})