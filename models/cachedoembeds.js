const mongoose = require("mongoose")

module.exports = mongoose.model("CachedOembeds", {
    _id: String, //The url
    res: Object
})