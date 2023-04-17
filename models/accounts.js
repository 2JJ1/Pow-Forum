const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

let schema = mongoose.Schema({
    _id: Number,
    username: {
        type: String,
        index: true,
    },
    password: {
        type: String,
        index: true,
    },
    email: String,
    roles: String,
    creationdate: Date,
    stripecustomerid: String,
    pendingcancellation: String,
    profilepicture: String,
    biography: String,
    cover_photo: String,
    alias: String,
    medias: String,
    signature: String,
    lastonline: Date,
    //If this property exists at all, the account is locked.
    //String is reason for lock
    locked: String,
    //Only set by Coinbase
    premium_expires: Date,
    //If this property exists, the account is pending email verification
    emailVerification: mongoose.Schema.Types.Mixed,
})

schema.plugin(AutoIncrement, {id: 'Accounts'})

module.exports = mongoose.model("Accounts", schema)