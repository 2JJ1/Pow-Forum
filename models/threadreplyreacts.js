const mongoose = require("mongoose")

module.exports = mongoose.model("ThreadReplyReacts", {
    uid: {
        type: Number,
        required: true,
        index: true,
    },
    trid: {
        type: Number,
        required: true,
        index: true,
    },
})