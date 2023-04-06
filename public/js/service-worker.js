self.addEventListener('push', function(event) {
	if (event.data) {
		var pushedMessage = JSON.parse(event.data.text())
		if(pushedMessage.type == "notification"){		
			let promiseChain = self.registration.showNotification(pushedMessage.title, pushedMessage.options);
			event.waitUntil(promiseChain);
		}
	}
})

self.addEventListener('notificationclick', function(event) {
    event.notification.close() // Android needs explicit close.
    event.waitUntil(
        clients.matchAll({type: 'window'}).then( windowClients => {
            // Check if there is already a window/tab open with the target URL
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // If so, just focus it.
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, then open the target URL in a new window/tab.
            if (clients.openWindow) return clients.openWindow(event.notification.data.link);
        })
    );
});