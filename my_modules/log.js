const fs = require('fs');

module.exports = function(content, logpath) { //
    fs.appendFile(logpath + "/logger.log", content, function (err) {
        if (err) throw err;
    });
};