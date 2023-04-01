const envfile = require('envfile')
const fs = require('fs')

/**
 * 
 * @param {Object} newVariables Object containing key values to insert into .env file
 */
module.exports = function updateEnv(newVariables){
    let parsedEnv = envfile.parse(fs.readFileSync('.env', "utf8"))

    for(let key in newVariables){
        process.env[key] = newVariables[key]
    }

    Object.assign(parsedEnv, newVariables)
    fs.writeFileSync('.env', envfile.stringify(parsedEnv))
}