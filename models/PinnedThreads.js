const mongoose = require('mongoose')

module.exports = mongoose.model("PinnedThreads", {
    //tid
    _id: Number,
})