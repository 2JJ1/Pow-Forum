const mongoose = require('mongoose')

module.exports = mongoose.model("FeedPosts", {
    _id: Number,
    uid: Number,
    date: Date,
    content: String,
    likes: Array,
})