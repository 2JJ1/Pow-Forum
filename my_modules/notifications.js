const mongoose = require("mongoose")
const webpush = require('web-push');

const accountapi = require('./accountapi');

const Notifications = mongoose.model("Notifications")
const NotificationSettings = mongoose.model("NotificationSettings")
const Sessions = mongoose.model("Sessions")

//Compiles notifications for display
exports.CompileNotifications = async function(notifications){
    //If is number ? its a user id : its an array of notifications
    if(typeof notifications === "number") notifications = await Notifications.find({recipientid: notifications}, null, {limit: 10})

    var result = []

    for(var i=notifications.length-1; i>=0; i--){
        var row = notifications[i]
        var notification = {}
        notification.text = row.text || "No data"
        notification.timestamp = row._id.getTimestamp() 
        notification.id = row._id.valueOf()
        notification.link = row.link || "/"
        notification.type = row.type
        if(row.senderid && !row.anonymous){
            notification.senderid = row.senderid
            notification.senderusername = await accountapi.GetUsername(row.senderid)
            notification.senderpfp = await accountapi.GetPFP(row.senderid)   
        }
        
        switch(row.type){
            case "threadreply":
                notification.text = `${notification.senderusername} has replied to your thread.`
                notification.link = `/t/${row.tid}?r=${row.trid}`
                break
            case "threadreplycomment":
                notification.text = `${notification.senderusername} has commented on your reply`
                notification.link = `/t/${row.tid}?r=${row.trid}`
                break
            case "threadcomment":
                notification.text = `${notification.senderusername} has commented on your thread`
                notification.link = `/t/${row.tid}?r=${row.trid}`
                break
            case "threadreplymention":
                notification.text = `${notification.senderusername} has mentioned you in a thread.`
                notification.link = `/t/${row.tid}?r=${row.trid}`
                break
            case "message":
                notification.text = `New message from ${notification.senderusername}`
                notification.link = `/messages/${notification.senderid}`
                break
            case "newrep":
                notification.text = `${row.anonymous ? "Someone" : notification.senderusername} has modified your reputation.`
                notification.link = `/profile/reputation`
                break
            case "newbadge":
                notification.text = `You received a new profile badge: ${row.badgeName}.`
                notification.link = "/profile"
                break
        }

        if(notification.textOverride) notification.text = textOverride

        result.push(notification)
    }

    return result
}

//Creates notification
exports.SendNotification = async function(options){
    options.senderid = parseInt(options.senderid)
    options.recipientid && (options.recipientid = parseInt(options.recipientid))

    if(!options.type) throw new Error("type required to send a notification")

    let notificationSettings = await NotificationSettings.findById(options.recipientid) || {}

    let senderAccount = await accountapi.fetchAccount(options.senderid)

    switch(options.type){
        case "threadreply": {
            if(notificationSettings.threadReplies === false) break
            if(options.recipientid === options.senderid) throw new Error("Recipient and sender can't be the same")
            if(!options.senderid) throw new Error("senderid required")
            if(!options.recipientid) throw new Error("recipientid required")
            if(!options.tid) throw new Error("tid required")
            if(!options.trid) throw new Error("trid required")
            await new Notifications({
                type: options.type,
                senderid: options.senderid,
                recipientid: options.recipientid,
                read: false,
                tid: parseInt(options.tid),
                trid: parseInt(options.trid),
            }).save()
            await exports.PushNotification(
                options.recipientid, 
                `${senderAccount.username} has replied to your thread`,
                ``,
                `${process.env.FORUM_URL}/t/${options.tid}?r=${options.trid}`
            )
            break
        }
        case "threadcomment": {
            if(notificationSettings.threadReplies === false) break
            if(options.recipientid === options.senderid) throw new Error("Recipient and sender can't be the same")
            if(!options.senderid) throw new Error("senderid required")
            if(!options.recipientid) throw new Error("recipientid required")
            if(!options.tid) throw new Error("tid required")
            if(!options.trid) throw new Error("trid required")
            await new Notifications({
                type: options.type,
                senderid: options.senderid,
                recipientid: options.recipientid,
                read: false,
                tid: parseInt(options.tid),
                trid: parseInt(options.trid),
            }).save()
            await exports.PushNotification(
                options.recipientid, 
                `${senderAccount.username} has commented on your thread`,
                ``,
                `${process.env.FORUM_URL}/t/${options.tid}?r=${options.trid}`
            )
            break
        }
        case "threadreplycomment": {
            if(notificationSettings.threadReplies === false) break
            if(options.recipientid === options.senderid) throw new Error("Recipient and sender can't be the same")
            if(!options.senderid) throw new Error("senderid required")
            if(!options.recipientid) throw new Error("recipientid required")
            if(!options.tid) throw new Error("tid required")
            if(!options.trid) throw new Error("trid required")
            await new Notifications({
                type: options.type,
                senderid: options.senderid,
                recipientid: options.recipientid,
                read: false,
                tid: parseInt(options.tid),
                trid: parseInt(options.trid),
            }).save()
            await exports.PushNotification(
                options.recipientid, 
                `${senderAccount.username} has commented on your reply`,
                ``,
                `${process.env.FORUM_URL}/t/${options.tid}?r=${options.trid}`
            )
            break
        }
        case "threadreplymention": {
            if(notificationSettings.forumMentions === false) break
            if(options.recipientid === options.senderid) throw new Error("Recipient and sender can't be the same")
            if(!options.senderid) throw new Error("senderid required")
            if(!options.recipientid) throw new Error("recipientid required")
            if(!options.tid) throw new Error("tid required")
            if(!options.trid) throw new Error("trid required")
            await new Notifications({
                type: options.type,
                senderid: options.senderid,
                recipientid: options.recipientid,
                read: false,
                tid: parseInt(options.tid),
                trid: parseInt(options.trid),
            }).save()
            await exports.PushNotification(
                options.recipientid, 
                `${senderAccount.username} has mentioned you in a thread reply`,
                ``,
                `${process.env.FORUM_URL}/t/${options.tid}?r=${options.trid}`
            )
            break
        }
        case "newrep": {
            if(notificationSettings.newProfileRating === false) break
            if(options.recipientid === options.senderid) throw new Error("Recipient and sender can't be the same")
            if(!options.senderid) throw new Error("senderid required")
            if(!options.recipientid) throw new Error("recipientid required")
            let notification = {
                type: options.type,
                senderid: options.senderid,
                recipientid: options.recipientid,
            }
            if(options.anonymous) notification.anonymous = true
            await new Notifications(notification).save()
            await exports.PushNotification(
                options.recipientid, 
                `${options.anonymous ? "Someone" : senderAccount.username} has rated you`,
                ``,
                `${process.env.FORUM_URL}/profile/reputation`
            )
            break
        }
        case "newbadge": {
            if(!options.recipientid) throw new Error("recipientid required")
            if(!options.badgeName) throw new Error("name required for newbadge notification")
            await new Notifications({
                type: options.type,
                badgeName: options.badgeName,
                recipientid: options.recipientid,
            }).save()
            break
        }
        case "message": {
            if(notificationSettings.newMessages === false) break
            if(!options.recipientid) throw new Error("recipientid required")
            if(!options.senderid) throw new Error("senderid required")

            //Don't send push notification again if this notification already exists
            //Ensures native notification is pushed to the top
            if(!await Notifications.findOneAndDelete({
                type: options.type, 
                senderid: options.senderid, 
                recipientid: options.recipientid
            })) {
                await exports.PushNotification(
                    options.recipientid, 
                    `New message from ${senderAccount.username}`,
                    ``,
                    `${process.env.FORUM_URL}/?openChat=${options.senderid}`
                )
            }

            //Sends/saves native push notification
            await new Notifications({
                type: options.type,
                senderid: options.senderid,
                recipientid: options.recipientid,
            }).save()

            break
        }
        default: {
            //Bad practice. Should do escaping like above.
            await new Notifications(options).save()
            break
        }
    }
}

exports.PushNotification = async function(uid, title, content, link){
    let loginSessions = await Sessions.find({"session.uid": uid}, {"session.webpushsub": 1})

    for (let loginSession of loginSessions){
        if(!loginSession.session.webpushsub) continue

        await webpush.sendNotification(JSON.parse(loginSession.session.webpushsub), JSON.stringify({
            type: "notification",
            title, 
            options: {
                body : content,
                icon: `${process.env.FORUM_URL}/favicon.ico`,
                link, //For legacy serviceworker. Delete 1 month after april 2, 2023
                data: {
                    link
                }
            }
        }))
        .catch(async err => {
            //push subscription has unsubscribed or expired. Uncache the subscription
            if(err.statusCode === 410){
                await Sessions.findByIdAndUpdate(loginSession._id, {$unset: {"session.webpushsub": 1}})
            }
            //Log other errors except: throttle
            else if(err.statusCode !== 406){
                console.warn(`Webpush error for id:${copyRow.id}. Error:`, err)
            }
        })
    }
}

/**
 * Deletes specified notification
 * @param {string} objectid The target notification to delete
 * @param {number} uid UID of who is trying to delete the notification
 */
exports.DeleteNotification = async function(objectid, uid){
    await Notifications.deleteOne({
        _id: new mongoose.Types.ObjectId(objectid), 
        recipientid: uid //A member can only delete notifications made out to them
    })
    .then(doc => {
        if(!doc) throw "Failed to delete that notification."
    })
}