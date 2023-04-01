const url = require('url');
const mongoose = require("mongoose")

const ActiveUsers = mongoose.model("ActiveUsers")

exports.track = async function(req, description="Undisclosed"){
    //What page the client is viewing
    var urlPath = url.parse(req.originalUrl).pathname.substr(1);

    //Tracks for logged in users
    if(req.session.uid){
        await ActiveUsers.findOneAndUpdate({uid: req.session.uid}, {
            //Cache current data because of situations where it would be too intensive to grab every online member's data 1 by 1
            username: req.account.username,
            highestRole: req.account.highestRole,
            //The page they're browsing
            path: urlPath,
            time: Date.now()
        }, {upsert: true})
    } 
    //Tracks for non-logged in users
    else {
        await ActiveUsers.findOneAndUpdate({ip: (req.headers['x-forwarded-for'] || req.connection.remoteAddress)}, {
            //The page they're browsing
            path: urlPath,
            time: Date.now()
        }, {upsert: true})
    }
};

exports.retrieve = async function(options){
    var filter = {
        //Gets docs marked as browsing within the past 15 minutes
        time: {
            $gte: Date.now() - (1000*60*15)
        }
    }

    if(options){
        if("req" in options){
            //What page the client is viewing
            filter.path = url.parse(options.req.originalUrl).pathname.substr(1)
        }
        else if("path" in options){
            filter.path = options.path
        }
    }

    var activeUsers = await ActiveUsers.find(filter).sort({time: -1}).lean()

    var onlines = {
        members: [],
        guestcount: 0,
        //anonymous: [] //Create this and limit to patrons
    }

    //Puts each active user into the appropriate onlines listing
    activeUsers.forEach(activeUser => activeUser.uid ? onlines.members.push(activeUser) : onlines.guestcount += 1)

    return onlines
}