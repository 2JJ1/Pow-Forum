class sanitizeHTML_wrapper {
	constructor( config ) {
        this.roles = { //roles list and it's permissions in hierarchical order
			owner: [],
			moderator: [],
			junior: [],
			vip: []
		}
    }
	
	//Get's a persons role'ss by account user id
	async GetRolesFromUID(uid){
		let ClientRoles = await connection.query("SELECT roles FROM accounts WHERE uid=? LIMIT 1" , [uid])
		.then(result => {
			if(result.length){
				return result[0].roles
			}
		}).catch((error) => { console.warn(error) })
		
		return StringToArray(ClientRoles)
	}
}

module.exports = new sanitizeHTML_wrapper();