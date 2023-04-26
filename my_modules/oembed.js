//Replaces from DOM text nodes
function replaceTextInDOM(element, pattern, replacement) {
    for (let node of element.childNodes) {
        switch (node.nodeType) {
            case window.Node.ELEMENT_NODE:
                replaceTextInDOM(node, pattern, replacement);
                break;
            case window.Node.TEXT_NODE:
                var txt = window.document.createElement("span");
                txt.innerHTML = node.textContent.replace(pattern, replacement);
                node.replaceWith(txt);
                break;
            case window.Node.DOCUMENT_NODE:
                replaceTextInDOM(node, pattern, replacement);
        }
    }
}

/**
 * Searches for links in the HTML and replaces it with an image tag
 * @param text The text that contains the links
 * @param options An object which contains your options
 */
async function HTMLToOembed(html, options){
    //Default options
    options = options || {}

    //So we know what links to not convert to plain link
    let embeddedLinks = []

    let trustedDirectLinks = [
        /https:\/\/(.+\.)?giphy\.com/,
        /https:\/\/(.+\.)?tenor\.com/,
        /https:\/\/streamable\.com/,
        /https:\/\/(i\.)?redd\.it/,
        /https:\/\/(i\.)?imgur\.com/,
        /https:\/\/(i\.)?gyazo\.com/,
        /https:\/\/(cdn|media)\.discordapp\.com/,
        /https:\/\/media\.discordapp\.net/,
        new RegExp("https?:\/\/([a-zA-Z0-9-]*\.)?" + document.location.origin.replace(/^[^.]+\./g, "")),
    ]

    //Merges trusted links with received whitelist
    if (typeof options.fileDomainWhitelist === "object") options.fileDomainWhitelist.concat(trustedDirectLinks)
    //Uses supplied trusted whitelist only
    else if(typeof options.fileDomainWhitelist === "boolean") options.fileDomainWhitelist = trustedDirectLinks

    //Setup
    let fromString = typeof html === 'string'

    //In case of a bug, we don't want to fail to display the content
    //Let alone halt the entire web page
    try {
        // Image embeding

        //Converts direct image links to img tags
        options.imgFile = "imgFile" in options ? options.imgFile : true
        if(options.imgFile){
            let matches = (fromString ? html : html.innerHTML).match(/https:\/\/([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif|webp))/ig)
            matches = [...new Set(matches)]
            for (let match of matches) {
                //If a whitelist is specified, check if the matched URL's domain is whitelisted
                if("fileDomainWhitelist" in options){
                    //Do not convert this match because it is not a whitelisted domain
                    if(!options.fileDomainWhitelist.find(domain => match.match(domain))) continue
                }

                embeddedLinks.push(match)

                //Inserts embed; Replaces image link with img tag
                let rx = new RegExp(match, 'g')
                console.log("1", match)
                match = pFUtils.escapeHTML(match)
                console.log("2", match)
                console.log(fromString)
                let replacement = `<img src="${match}"/>`
                if(fromString) html = html.replaceAll(rx, replacement)
                else replaceTextInDOM(html, rx, replacement)
            }
        }

        //Converts video links to img tags
        options.videoFile = "videoFile" in options ? options.videoFile : true
        if(options.videoFile){
            let matches = (fromString ? html : html.innerHTML).match(/https:\/\/([a-z\-_0-9\/\:\.]*\.(mp4|mov))/ig)
            matches = [...new Set(matches)]
            for (const match of matches) {
                //If a whitelist is specified, check if the matched URL's domain is whitelisted
                if("fileDomainWhitelist" in options){
                    //Do not convert this match because it is not a whitelisted domain
                    if(!options.fileDomainWhitelist.find(domain => match.match(domain))) continue
                }

                embeddedLinks.push(match)

                //Inserts embed; Replaces image link with img tag
                let rx = new RegExp(match, 'g')
                let replacement = `<video controls controlsList="nodownload" preload="none">
                    <source src="${match}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`
                if(fromString) html = html.replaceAll(rx, replacement)
                else replaceTextInDOM(html, rx, replacement)
            }
        }

        //Converts gyazo links to img tags
        options.gyazo = "gyazo" in options ? options.gyazo : true
        if(options.gyazo){
            let matches = (fromString ? html : html.innerHTML).match(/https:\/\/gyazo.com\/\w*/g)
            matches = [...new Set(matches)]
            for (const match of matches) {
                let embedResponse = await fetch(`https://api.gyazo.com/api/oembed?url=${match}`)
                .then(res => res.json())
                .catch(e=>{})
                if(!embedResponse) continue

                embeddedLinks.push(match)

                // Inserts embed
                //Embeds gifs
                if(embedResponse.html){
                    let rx = new RegExp(match, 'g')
                    if(fromString) html = html.replaceAll(rx, embedResponse.html)
                    else replaceTextInDOM(html, rx, embedResponse.html)
                }
                //Converts images to img tags
                else{
                    let rx = new RegExp(match, 'g')
                    let newTag = `<img src="${embedResponse.url}"/>`
                    if(fromString) html = html.replaceAll(rx, newTag)
                    else replaceTextInDOM(html, rx, newTag)
                }
            }
        }

        //Embeds Imgur Streamable. Should turn this into a plain image tag if I can figure out how to extract the image
        options.streamable = "streamable" in options ? options.streamable : true
        if(options.streamable){
            let matches = (fromString ? html : html.innerHTML).match(/https:\/\/streamable.com\/(\w*)/g)
            matches = [...new Set(matches)]
            for (const match of matches) {
                let embedResponse = await fetch(`https://api.streamable.com/oembed.json?url=${match}`)
                .then(res => res.json())
                .catch(e=>{})
                if(!embedResponse) continue

                embeddedLinks.push(match)

                if(!embedResponse) embedResponse = {html: '<span class="red">[Dead Streamable Link]</span>'}

                //Inserts embed
                let rx = new RegExp(match, 'g')
                if(fromString) html = html.replaceAll(rx, embedResponse.html)
                else replaceTextInDOM(html, rx, embedResponse.html)
            }
        }

        //Embeds Imgur links
        options.imgur = "imgur" in options ? options.imgur : true
        if(options.imgur){
            let matches = (fromString ? html : html.innerHTML).match(/https:\/\/imgur.com\/(a|gallery)\/(\w*)/g)
            matches = [...new Set(matches)]
            for (const match of matches) {
                let embedResponse = await fetch(`https://api.imgur.com/oembed?url=${match}`)
                .then(res => res.json())
                .catch(e=>{})
                if(!embedResponse) continue

                embeddedLinks.push(match)

                //Inserts embed
                let rx = new RegExp(match, 'g')
                if(fromString) html = html.replaceAll(rx, embedResponse.html)
                else replaceTextInDOM(html, rx, embedResponse.html)
            }
        }

        //Embeds giphy gif links
        options.giphy = "giphy" in options ? options.giphy : true
        if(options.giphy){
            let matches = (fromString ? html : html.innerHTML).match(/https:\/\/giphy.com\/gifs\/[\w-]+/g)
            matches = [...new Set(matches)]
            for (const match of matches) {
                let embedResponse = await fetch(`https://giphy.com/services/oembed?url=${match}`)
                .then(res => res.json())
                .catch(e=>{})
                if(!embedResponse) continue

                embeddedLinks.push(match)

                let replacement = `<img src="${embedResponse.url}"\>`

                //Inserts embed
                let rx = new RegExp(match, 'g')
                if(fromString) html = html.replaceAll(rx, replacement)
                else replaceTextInDOM(html, rx, replacement)
            }
        }

        // Platform embeds

        //Embeds Codepen pens
        options.codepen = "codepen" in options ? options.codepen : true
        if(options.codepen){
            let matches = (fromString ? html : html.innerHTML).match(/https:\/\/codepen.io\/[a-z\-_0-9\/\:\.]*\/pen\/\w*/g)
            matches = [...new Set(matches)]
            for (const match of matches) {
                let embedResponse = await fetch(`http://codepen.io/api/oembed?format=json&url=${match}`)
                .then(res => res.json())
                .catch(e=>{})
                if(!embedResponse) continue

                embeddedLinks.push(match)

                //Inserts embed
                let rx = new RegExp(match, 'g')
                if(fromString) html = html.replaceAll(rx, embedResponse.html)
                else replaceTextInDOM(html, rx, embedResponse.html)
            }
        }

        //Plain links
        options.links = "links" in options ? options.imgFile : true
        if(options.links){
            let matches = (fromString ? html : html.innerHTML).match(/https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/ig)
            matches = [...new Set(matches)]
            for (const match of matches) {
                //Do not convert already embedded links to plain links
                if(embeddedLinks.indexOf(match) !== -1) continue

                //Inserts embed; Replaces image link with img tag
                let rx = new RegExp(match, 'g')
                let replacement = `<a href="${match}" target="_blank" rel=""noreferrer nofollow"/>${match}</a>`
                if(fromString) html = html.replaceAll(rx, replacement)
                else replaceTextInDOM(html, rx, replacement)
            }
        }
    }
    catch(e) {
        console.error(e)
    }
    if(fromString) return html
}