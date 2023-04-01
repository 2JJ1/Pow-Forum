const mongoose = require("mongoose")

module.exports = mongoose.model("Messages", {
    time: {
        type: Number,
        index: true,
    },
    from: Number,
    to: Number,
    content: String,
})