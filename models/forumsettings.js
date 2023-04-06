const mongoose = require('mongoose')

module.exports = mongoose.model("ForumSettings", {
    type: {
        type: String,
        index: true,
        unique: true,
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
    },
})