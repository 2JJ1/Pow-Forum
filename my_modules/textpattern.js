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
function TextHasWords(text, words){
	//Simplify parsing
	text = text.toLowerCase()
	
	//Check all words
	for(index in words){
		//Define the word to check for
		let word = words[index]
		
		if(Array.isArray(word)){
			// Must contain either of the words in the array
			
			let hasWord = false
			
			for(subword in word){
				let _word = word[subword].toLowerCase();
				
				//Check if string has the word
				if(text.indexOf(_word) !== -1){
					//String has word
					hasWord = true
					break
				}
			}
			
			if(!hasWord) return false;
		} 
		else {
			//Must contain the word
			
			//Simplify parsing
			word = word.toLowerCase();
			
			//If string does not have the word
			if(text.indexOf(word) === -1) return false
		}
	}
	//No early exit, so must've passed
	return true
}

module.exports = function(text){
    for(var i=0; i<exports.autoResponders.checkers.length; i++){ //Goes through each checker
        if(TextHasWords(text, exports.autoResponders.checkers[i])){
            //Fetch response
            return exports.autoResponders.responses[i]
        }
    }
}