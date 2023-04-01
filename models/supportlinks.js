const mongoose = require("mongoose")

module.exports = mongoose.model("SupportLinks", {
    label: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        required: true,
    },
    newTab: Boolean,
    tooltip: String,
})