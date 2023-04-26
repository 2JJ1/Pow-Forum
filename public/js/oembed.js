//Replaces from DOM text nodes
function replaceTextInDOM(element, pattern, replacement) {
    let childNodes = Array.from(element.childNodes)
    for(let i=childNodes.length-1; i>=0; i--){
        let node = childNodes[i]
        switch (node.nodeType) {
            case window.Node.ELEMENT_NODE:
                replaceTextInDOM(node, pattern, replacement);
                break;
            case window.Node.TEXT_NODE: {
                if(!node.parentElement) continue
                if(node.nodeValue === "\n") continue
                let elem = document.createElement("span")
                node.textContent = pFUtils.escapeHTML(node.textContent)
                elem.innerHTML = node.textContent.replace(pattern, replacement)
                node.replaceWith(elem)
                break;
            }
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

    let trustedDirectLinks = [
        /https:\/\/(.+\.)?giphy\.com/i,
        /https:\/\/(.+\.)?tenor\.com/i,
        /https:\/\/streamable\.com/,
        /https:\/\/(i\.)?redd\.it/i,
        /https:\/\/(i\.)?imgur\.com/i,
        /https:\/\/(i\.)?gyazo\.com/i,
        /https:\/\/(cdn|media)\.discordapp\.(com|net)/i,
        /https:\/\/media\.discordapp\.net/i,
        new RegExp("https?:\/\/([a-zA-Z0-9-]*\.)?" + document.location.origin.replace(/^[^.]+\./g, ""), "i"),
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
        //Get all links
        //Regex considers html encoding
        let links = (fromString ? html : html.textContent).match(/https:\/\/[a-z0-9\-_]+\.[a-z0-9\-_]+[a-z0-9\-_\/\.\?\&=;]+/ig)
        for(let link of [...new Set(links)]){
            let replacement

            // Image embeding

            //Converts direct image links to img tags
            if(
                //Check that this option is not disabled
                "imgFile" in options ? options.imgFile : true
                //Check if is image link
                && /\/[a-z0-9\-_]+\.(jpg|jpeg|png|gif|webp)/i.test(link)
            ){
                //If a whitelist is specified, check if the matched URL's domain is whitelisted
                if("fileDomainWhitelist" in options){
                    //Do not convert this match because it is not a whitelisted domain
                    if(!options.fileDomainWhitelist.find(domain => link.match(domain))) continue
                }

                //Inserts embed; Replaces image link with img tag
                replacement = `<img src="${link}"/>`
            }

            //Converts video links to img tags
            else if(
                "videoFile" in options ? options.videoFile : true
                //Check if is video link
                && /\/[a-z0-9\-_]+\.(mp4|mov)/i.test(link)
            ){
                    //If a whitelist is specified, check if the matched URL's domain is whitelisted
                if("fileDomainWhitelist" in options){
                    //Do not convert this match because it is not a whitelisted domain
                    if(!options.fileDomainWhitelist.find(domain => link.match(domain))) continue
                }

                //Inserts embed; Replaces image link with img tag
                replacement = `<video controls controlsList="nodownload" preload="none">
                    <source src="${link}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`
            }

            //Embeds Streamable.com links
            else if(
                "streamable" in options ? options.streamable : true
                //Check if is streamable.com link
                && /https:\/\/streamable.com\/(\w*)/i.test(link)
            ){
                let embedResponse = await fetch(`https://api.streamable.com/oembed.json?url=${link}`)
                .then(res => res.json())
                .catch(e=>{})
                if(!embedResponse) continue

                if(!embedResponse) embedResponse = {html: '<span class="red">[Dead Streamable Link]</span>'}

                replacement = embedResponse.html
            }

            //Defaults to embedding as plain link
            //Wraps in anchor tag
            else if("links" in options ? options.links : true){
                //Inserts embed; Replaces image link with img tag
                replacement = `<a href="${link}">${link}</a>`
            }

            let rxString = link.replaceAll(".", "\\.").replaceAll("?", "\\?")
            if(!fromString) rxString = pFUtils.escapeHTML(rxString)
            let rx = new RegExp(rxString, 'g')
            
            if(fromString) html = html.replaceAll(rx, replacement)
            else replaceTextInDOM(html, rx, replacement)
        }
    }
    catch(e) {
        console.error(e)
    }
    if(fromString) return html
}