const mongoose = require('mongoose')

module.exports = mongoose.model("Sessions", {
    _id: String,
    session: Object,
})