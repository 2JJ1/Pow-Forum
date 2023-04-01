const fs = require("fs")
const path = require("path")

/*Requires all files(except this one) in this folder assuming they're models so they're ready 
to be called with mongoose.model(<ModelName>)*/
fs.readdirSync(__dirname).forEach(fileName => {
    if(fileName !== "index.js") require(path.join(__dirname, fileName))
})