window.pFUtils = {
    escapeHTML: function(unsafe){
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
    },

    selfURLRegex: new RegExp("https?:\/\/([a-zA-Z0-9-]*\.)?" + document.location.origin.replace(/^[^.]+\./g, "")),

    isClientOverpowerTarget: function(clientRoles, targetRoles){
		// Check roles in hierarchical order
		//Admins have power over everyone
		if(clientRoles.includes("admin")) return true
		//Client is a moderator
		else if(clientRoles.includes("moderator")){
			//Moderators can't affect moderators or admins
			if(targetRoles.includes("moderator")|| targetRoles.includes("admin")) return false

			//No early exit, so assume target is below the moderator
			return true
		}
		
		//Default to false
		return false
    },

	queryParams: new Proxy(new URLSearchParams(window.location.search), {
		get: (searchParams, prop) => searchParams.get(prop),
	})
}