const mongoose = require('mongoose')
var escape = require('escape-html')
const stripCombiningMarks = require('strip-combining-marks')
const phraseblacklist = require('phrase-blacklist')

const other = require('./other')
const accountAPI = require('./accountapi')

const LoginHistories = mongoose.model('LoginHistories')
const AltAccounts = mongoose.model('AltAccounts')

/**
 * Takes the input, searches for @uid or @username mentions and converts them to profile links
 * @param {String} input What string to process mentions from
 * @returns {String} Newly processed string with mention links
 */
exports.ProcessMentions = async function(input){
    let mentionedUIDsRegex = /@(\d+)/g
    let match
    while ((match = mentionedUIDsRegex.exec(input)) != null) {
        let account = await accountAPI.fetchAccount(match[1])
        if(!account) continue

        //Ensures match is not partial match
        let followUpChar = input.charAt(match.index + match[0].length)
        if(/[\w|\d|_]/.test(followUpChar)) continue
        
        input = other.StringSplice(input, match.index, match[0].length, `<a href="/profile?uid=${match[1]}">@${account.username}</a>`)
    }

    //Converts username mentions to link
    let mentionedUsernamesRegex = /@(([\w|\d|_|-]+){3})/g
    match = undefined
    let matches = []
    while ((match = mentionedUsernamesRegex.exec(input)) != null) {
        matches.push(match)
    }
    //Must iterate backwards to prevent infinite loop due to repeat matches inserted after last index
    for(let i=matches.length-1; i>=0; i--){
        match = matches[i]
        let account = await accountAPI.fetchAccount(match[1])
        //Idk why match is ever null anyway... I mean... The while loop above explicity says != null.
        if(!account) continue

        //Ensures match is not partial match
        let followUpChar = input.charAt(match.index + match[0].length)
        if(/[\w|\d|_]/.test(followUpChar)) continue
        
        input = other.StringSplice(input, match.index, match[0].length, `<a href="/profile?uid=${account._id}">@${account.username}</a>`)
    }

    return input
}

/**
 * Returns array of mentioned UIDs from input string
 * @param {*} input 
 */
exports.GetMentionedUIDs = async function(input){
    let mentions = []

    let uidMentionRegex = /@(\d)+/g
    for(let match of [...input.matchAll(uidMentionRegex)]){
        let account = await accountAPI.fetchAccount(match[1])
        if(!account) continue
        mentions.push(account._id)
    }

    let usernameMentionRegex = /@(([\w|\d|_]+){3})/g
    for(let match of [...input.matchAll(usernameMentionRegex)]){
        let account = await accountAPI.fetchAccount(match[1])
        if(!account) continue
        mentions.push(account._id)
    }

    return [...new Set(mentions)]
}

exports.TrackLogin = async function(uid, ip){
    //Logs their login
    await new LoginHistories({
        uid,
        ip,
        date: new Date()
    }).save()

    // Alt account handler
    //Find other accounts that used the same IP in the past 3 days
    let possibleAlts = await accountAPI.findAlts({uid})
    possibleAlts = possibleAlts.uids
    
    //If one is found, add it to their suspected alt accounts list
    if(possibleAlts.length > 0){
        //Get their current suspected alt accounts list
        let altAccounts = await AltAccounts.findById(uid).lean()
        let matches = altAccounts ? altAccounts.matches : {}

        //Update/insert each new possible alt
        for(let altUId of possibleAlts){
            if(altUId == uid) continue //Skip self
            
            matches[altUId] = {
                date: new Date(),
            }

            //Also adds the client account as a suspected alt on the suspected alt
            let altAccounts2 = await AltAccounts.findById(altUId).lean()
            let matches2 = altAccounts2 ? altAccounts2.matches : {}
            matches2[uid] = {
                date: new Date(),
            }
            await AltAccounts.updateOne({_id: altUId}, {matches: matches2}, {upsert: true})
        }

        //Updates the suspected alternate accounts in the DB
        await AltAccounts.updateOne({_id: uid}, {matches}, {upsert: true})
    }
}

exports.CountAccountsOnIp = async function(ip, daysRange){
    let filter = { ip }

    if(daysRange) filter.date = { $gt: new Date(Date.now() - 1000*60*60*24*daysRange) }

    let sharedAccounts = await LoginHistories.distinct('uid', filter)
    return sharedAccounts.length
}

exports.validateTopic = function(topic){
    //Check that the topic is family friendly
    let isClean = phraseblacklist.isClean(topic.toLowerCase())
    if(typeof isClean === "string") throw `Topic contains blacklisted phrase: ${isClean}`

    //Removes unnecessary spaces from the ends
    topic = topic.trim()

    if(
        //Count letters only for minimum. Prevents empty spaces or random character threads
        (topic.match(/\w/g)||"").length < 10 || 
        topic.length > 120
    ) throw "Topic must be 10-120 characters long"

    //Removes unnecessary spaces from the ends
    topic = topic.trim()	

    //Sets the topic whitelist to ASCII and emojis only
    //Prevents extremely long thread topics like from using arabic characters
    if(!/^(?:[\x20-\x7E|\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]])+$/.test(topic)){
        throw "Only ASCII(English keyboard characters) and emoji characters are allowed in the topic"
    }

    //Escapes the topic to prevent XSS
    topic = escape(topic)

    //Removes spammy looking text (Zalgo)
    topic = stripCombiningMarks(topic)

    return topic
}