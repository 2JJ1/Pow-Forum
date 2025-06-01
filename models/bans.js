const mongoose = require('mongoose')

module.exports = mongoose.model("Bans", {
    ip: {
        type: String,
        index: true,
    },
    username: {
        type: String,
        index: true,
    },
    email: {
        type: String,
        index: true,
    },
})