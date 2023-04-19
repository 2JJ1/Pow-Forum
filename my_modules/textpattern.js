exports.autoResponders = {
    //Roles which the autoresponder will ignore. Lower case only.
    ignoreRoles: ["moderator", "admin", "mini-moderator"],
    checkers: [
        [["update", "working", "unpatch", "january", "jan ", "february", "feb ", 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'november', 'december']],
        [["number 1", "the best", "the top"]],
		[["robux", "roblox", 'rbx']]
    ],
    responses: [
        "Detected possible unnecessary patch status: Per description rules- If the exploit is not marked as patched, it is expected to be operational. Notifying by description is redundant and spam.",
        'Per description rules- Avoid clickbait or over-glorifying descriptions. Instead of saying "#1 Lua executor", say "Reliable & Powerful."',
		"Do not use Roblox trademarks or similar in the description.",
    ],
}

//Checks if string has all of the strings in the words array
function TextHasWords(text, words) {
	text = text.toLowerCase();
	for (let word of words) {
		if (Array.isArray(word)) {
			let foundSubword = false;
			for (let subword of word) {
				if (text.includes(subword.toLowerCase())) {
					foundSubword = true;
					break;
				}
			}
			if (!foundSubword) return false;
		} else if (!text.includes(word.toLowerCase())) {
			return false;
		}
	}
	return true;
} 

module.exports = function(text){
    for(var i=0; i<exports.autoResponders.checkers.length; i++){ //Goes through each checker
        if(TextHasWords(text, exports.autoResponders.checkers[i])){
            //Fetch response
            return exports.autoResponders.responses[i]
        }
    }
}