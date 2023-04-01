const mongoose = require('mongoose')

module.exports = mongoose.model("NotificationSettings", {
    //uid
    _id: Number,
    newMessages: Boolean,
    threadReplies: Boolean,
    forumMentions: Boolean,
    newProfileRating: Boolean,
})