const fetch = require("node-fetch")
const escape = require('escape-html');

module.exports = async function(){
    const redditors = [
        "me_irl",
        "Dankmemes",
        "funny"
    ];
    
    return await fetch(`https://api.reddit.com/r/${redditors[Math.floor(Math.random() * redditors.length)]}/random`)
    .then(res => res.json())
    .then(d => {
        const data = d[0].data.children[0].data;

        return `${data.url}<br>
        ${escape(data.title.substring(0, 256))}<br>
        ${data.ups} 👍 | ${data.downs} 👎 | ${data.num_comments} 💭
        `
    })
    .catch(e => {})
}