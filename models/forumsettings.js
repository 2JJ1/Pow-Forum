const mongoose = require('mongoose')

module.exports = mongoose.model("ForumSettings", {
    type: {
        type: String,
        index: true,
    },
    value: {
        type: String
    },
})