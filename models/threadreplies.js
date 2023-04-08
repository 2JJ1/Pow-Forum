const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

let schema = mongoose.Schema({
    _id: Number,
    uid: {
        type: Number,
        index: true,
    },
    tid: {
        type: Number,
        index: true,
    },
    //If trid exists, this reply is a comment to the reply id, [trid]
    trid: {
        type: Number,
        index: true,
    },
    category: {
        type: Number,
        index: true,
    },
    date: Date,
    content: String,
    hidden: Boolean,
})

schema.plugin(AutoIncrement, {id: 'ThreadReplies'})

schema.virtual('thread', {
    ref: 'Threads',
    localField: 'tid',
    foreignField: '_id',
    justOne: true // for many-to-1 relationships
})

module.exports = mongoose.model("ThreadReplies", schema)