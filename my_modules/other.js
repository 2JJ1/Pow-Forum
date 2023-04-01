var sanitizeHtml = require('sanitize-html');

class Other {
	//Converts a string to an array
	StringToArray(string){ //If string is array, return as converted array, otherwise empty array
		//check if string is parsable as JSON
		try {
			string = JSON.parse(string);
		} 
		catch (e) {
			return [];
		}
		
		//null 0, and bools wont raise an exception, so run additional checks below
		if(string==null) return [];
		if(string.constructor.name.toLowerCase() != "array") return []

		//no flags raised, so pass
		return string
	}
	
	StringToJSON(jsonstring){ //If string is JSON, return as converted object, otherwise empty object
		//check if string is parsable as JSON
		try {
			jsonstring = JSON.parse(jsonstring);
		} catch (e) {
			return {};
		}
		
		//null 0, and bools wont raise an exception, so run additional checks below
		if(jsonstring==null) return {};
		if(jsonstring.constructor.name.toLowerCase() != "object" && jsonstring.constructor.name.toLowerCase() != "array") {
			return {}
		}
		
		//no flags raised, so pass
		return jsonstring
	}
	
	isAlphaNumeric_(ch){
		//Strings containing anything other than letters, numbers, and _ will fail
		return ch.match(/^[0-9a-zA-Z_]+$/i) !== null;
	}
	
	//also used for URL validation
	extractHostname(url) {
		var hostname;
		//find & remove protocol (http, ftp, etc.) and get hostname

		if (url.indexOf("//") > -1) {
			hostname = url.split('/')[2];
		}
		else {
			hostname = url.split('/')[0];
		}

		//find & remove port number
		hostname = hostname.split(':')[0];
		//find & remove "?"
		hostname = hostname.split('?')[0];
		
		var splitArr = hostname.split('.'),
			 arrLen = splitArr.length;
		
		//make sure nothing after . is empty
		if (arrLen >= 2) {
			for(let word in splitArr){
				if(splitArr[word].length < 1) { //only would pass if domain looks like,		www.domain.
					hostname = ""
					break
				}
			}
		} else hostname = ""

		return hostname;
	}

	// To address those who want the "root domain," use this function:
	extractRootDomain(url) {
		var domain = this.extractHostname(url),
			splitArr = domain.split('.'),
			arrLen = splitArr.length;

		//extracting the root domain here
		//if there is a subdomain 
		if (arrLen > 2) {
			domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
			//check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
			if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
				//this is using a ccTLD
				domain = splitArr[arrLen - 3] + '.' + domain;
			}
		}
		return domain;
	}
	
	ValidateEmail(mail) {
		if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,63})+$/.test(mail))
			return (true);
		return (false);
	}

	isSecureURL(str) {
		return /^(https:\/\/).*\..*/.test(str)
	}

	StringSplice(str, index, count, add) {
		// We cannot pass negative indexes directly to the 2nd slicing operation.
		if (index < 0) {
		  index = str.length + index;
		  if (index < 0) {
			index = 0;
		  }
		}
	  
		return str.slice(0, index) + (add || "") + str.slice(index + count);
	}

	EscapeRegex(regexStr) {
		return regexStr.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
	}

	ThreadSanitizeHTML(dirty) {
		return sanitizeHtml(dirty, {
			allowedTags: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
			'li', 'b', 'i', 'strong', 'em', 'strike', 'hr', 'br', 'div', 'span', 'pre', 'code'],
			allowedAttributes: {
				"a": [ 'href', 'name', 'target' ],
				"span": ['style'],
				"p": ["style"],
			},
			allowedSchemes: [ 'https', 'mailto' ], //Prevents vulnerabilities like opening apps with their scheme
			allowedSchemesAppliedToAttributes: [ 'href', 'src' ],
			allowedIframeHostnames: ['www.youtube.com'],
			allowedStyles: {
				'*': {
				  // Match HEX and RGB
				  'color': [/^#(cd201f|e11d48|c0392b|1abc9c|2ecc71|3498db|2980b9|e67e22|f1c40f|6d28d9|9333ea|c026d3|34495e|795548)$/],
				  'text-align': [/^left$/, /^right$/, /^center$/],
				  // Match 8pt, 10pt, 12pt, 14pt, 18pt, 24pt, 36pt
				  'font-size': [/^(8|10|12|14|18|24|36)(pt)$/],
				  'text-decoration': [/^(underline|line-through)$/],
				}
			},
			allowedClasses: {
				'pre': ["language-lua", "language-cpp", "language-csharp", "language-python", "language-php", "language-javascript", "language-markup", "language-css", "language-rust"],
				'code': ["language-lua", "language-cpp", "language-csharp", "language-python", "language-php", "language-javascript", "language-markup", "language-css", "language-rust"],
			},
			
		})
	}
}

module.exports = new Other();