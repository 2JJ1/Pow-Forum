var cors = require('cors');

const AccountCorsOptions = {
	origin: function (origin, callback) {
		// If the request has no origin (such as a Tauri app), allow it
		if (!origin) {
			callback(null, true);
		} else {
			const allowedOrigins = [
				process.env.FORUM_URL,
				'https://wearedevs.net', 
				'https://www.wearedevs.net',
				'https://api.wearedevs.net', 
				'https://dllinjector.net',
				'http://localhost:3000', 
				'http://localhost:1420',
				'http://localhost:8008', 
				'http://localhost:8085',
				"https://tauri.localhost",
				"http://tauri.localhost",
			];
			if (allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		}
	},
	credentials: true
};

module.exports = cors(AccountCorsOptions);