const mongoose = require('mongoose')

module.exports = mongoose.model("NavigationBarLinks", {
    link: {
        type: String,
        index: true,
    },
    //What should the link say?
    text: {
        type: String
    },
    //Link accessibility tooltip
    altText: {
        type: String
    },
    //Add the advertisement tool tip?
    isAd: {
        type: Boolean,
    },
})