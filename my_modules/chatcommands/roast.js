const responses = require('./flatdbs/roasts')

module.exports = async function(){
    return responses[Math.floor(Math.random()*responses.length)]
}