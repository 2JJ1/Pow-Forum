const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

const schema = mongoose.Schema({
    _id: Number,
    forum: {
        type: String,
        index: true,
    },
    title: String,
    uid: {
        type: Number,
        index: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    locked: Number,
    /*threadReplies: [{
        type: Number,
        ref: "ThreadReplies",
    }],*/
})

schema.plugin(AutoIncrement, {id: 'Threads'})

schema.virtual('threadReplies', {
    ref: 'ThreadReplies',
    localField: '_id',
    foreignField: 'tid',
})

module.exports = mongoose.model("Threads", schema)