const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

const schema = mongoose.Schema({
    _id: Number,
    uid: Number,
    tid: Number,
})

schema.plugin(AutoIncrement, {id: 'DownloadLinks'})

module.exports = mongoose.model("DownloadLinks", schema)