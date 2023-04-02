const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

const schema = mongoose.Schema({
    _id: Number,
    category: {
        type: Number,
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
})

schema.plugin(AutoIncrement, {id: 'Threads'})

module.exports = mongoose.model("Threads", schema)