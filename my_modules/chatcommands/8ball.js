const responses = require('./flatdbs/eightball')

module.exports = async function(msg){
    if(msg.split(" ").length < 3) throw "Your question is too short."

    return responses[Math.floor(Math.random()*responses.length)]
}