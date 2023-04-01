const mongoose = require('mongoose')
const { Schema } = mongoose

module.exports = mongoose.model("ForumAuditLogs", {
    time: {
        type: Number,
        index: true,
    },
    type: String, //Type of audit
    tid: Number, //For thread id
    targetUID: Number, //Who owns
    byUID: Number, //Who did it
    trid: Number,
    content: Schema.Types.Mixed,
    value: mongoose.Schema.Types.Mixed,
    reason: String,
})