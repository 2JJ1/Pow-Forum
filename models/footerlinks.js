const mongoose = require("mongoose")

module.exports = mongoose.model("FooterLinks", {
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