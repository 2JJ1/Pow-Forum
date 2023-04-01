var cors = require('cors');

const AccountCorsOptions = {
	origin: [
		'https://wearedevs.net', 
		'https://www.wearedevs.net',
		'https://api.wearedevs.net', 
		'https://dllinjector.net',
		"http://localhost:3000", 
		"http://localhost:8008", 
		'http://localhost:8085'
	], 
	credentials: true
}

module.exports = cors(AccountCorsOptions);