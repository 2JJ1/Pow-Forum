const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

let schema = mongoose.Schema({
    order: Number,
    name: String,
    description: String,
    requiredRoles: Array,
    database: String,
    group: String,
})

schema.plugin(AutoIncrement, {id: 'Categories', inc_field: 'order'})

module.exports = mongoose.model("Categories", schema)