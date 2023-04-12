const mongoose = require("mongoose")

module.exports = mongoose.model("Notifications", {
    senderid: Number, //Who is sending this notification
    recipientid: { //Who is to receive this notification
        type: Number,
        index: true,
    },
    type: String, //What type of notification this is
    read: Boolean, //This is probably useless
    anonymous: Boolean, //Should we display the sender's details?
    //Forum related
    tid: { //Thread id
        type: Number,
        index: true,
    },
    trid: Number, //Thread reply ID
    //Badge related
    badgeName: String,
})