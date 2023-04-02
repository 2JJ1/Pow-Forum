const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

let schema = mongoose.Schema({
    _id: Number,
    order: Number,
    name: String,
})

schema.plugin(AutoIncrement, {id: 'CategoriesId'})
schema.plugin(AutoIncrement, {id: 'CategoriesSort', inc_field: 'order'})

module.exports = mongoose.model("Categories", schema)