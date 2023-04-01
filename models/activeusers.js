const mongoose = require('mongoose')

module.exports = mongoose.model("ActiveUsers", {
    path: {
        type: String,
        index: true,
    },
    time: {
        type: Number,
        index: true,
    },
    uid: {
        type: Number,
        index: true,
    },
    username: {
        type: String,
        index: true,
    },
    highestRole: String,
    ip: {
        type: String,
        index: true,
    },
})