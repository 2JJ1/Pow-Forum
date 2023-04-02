const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

let schema = mongoose.Schema({
    _id: Number,
    order: Number,
    name: String,
    description: String,
    requiredRoles: Array,
    category: String,
})

schema.plugin(AutoIncrement, {id: 'SubcategoriesId'})
schema.plugin(AutoIncrement, {id: 'SubcategoriesSort', inc_field: 'order'})

module.exports = mongoose.model("Subcategories", schema)