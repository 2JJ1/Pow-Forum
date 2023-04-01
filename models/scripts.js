const mongoose = require("mongoose")

module.exports = mongoose.model("Scripts", {
    name: String,
    description: String,
    developer: String,
    download: String,
    tags: Object,
})