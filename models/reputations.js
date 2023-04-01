const mongoose = require('mongoose')

module.exports = mongoose.model("Reputations", {
    for: {
        type: Number,
        index: true,
    },
    from: {
        type: Number,
        index: true,
    },
    diff: Number,
    comment: String,
    date: Date,
})