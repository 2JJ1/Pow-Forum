const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

let schema = mongoose.Schema({
    order: Number,
    name: String,
})

schema.plugin(AutoIncrement, {id: 'CategoryGroups', inc_field: 'order'})

module.exports = mongoose.model("CategoryGroups", schema)