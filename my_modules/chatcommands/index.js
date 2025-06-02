var { parseArgsStringToArgv } = require('string-argv');
var parseArgs = require('minimist')

const commands = {
    //Fun commands
    "8ball": require('./8ball'),
    "roast": require('./roast'),
}

module.exports = async function HandleCommand(msg){
    var command = msg.substring(1).toLowerCase().split(" ");

    var msgarr = parseArgsStringToArgv(msg)
    var opts = parseArgs(msgarr)
    delete opts._
    msg.opts = opts

    if(command[0] in commands){
        return await commands[command[0]](msg)
    }
}