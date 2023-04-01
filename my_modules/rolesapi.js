const mongoose = require('mongoose')

const other = require('./other')

const Accounts = mongoose.model('Accounts')

//MySQL database connection
class RolesAPI {
	constructor( config ) {
        this.roles = { //roles list and it's permissions in hierarchical order
			admin: ['rate', 'rate2', 'rateNeg10'],
			moderator: ['rate', 'rate2', 'rateNeg10'],
			patron: ['rate', 'rate2'],
			contentCreator: ['rate'], //Basically VIP, but with a unique title
			vip: ['rate'],
			noticed: ['rate'],
		}
    }

	//Get's a person's roles by account user id
	async GetRolesFromUID(uid){
		let account = await Accounts.findById(uid) || {}
		return other.StringToArray(account.roles)
	}

	//Returns guaranteed roles
	async SanitizeRoles(roles){
		//If roles is a number, assume its an account uid. Get their roles from DB
		if(typeof roles === "number"){
			roles = await this.GetRolesFromUID(roles)
		}

		//If roles is a string, assume it is just an array in a string, so convert it
		if(typeof roles === "string"){
			roles = other.StringToArray(roles)
		}

		if(roles && typeof roles === "object" && roles.constructor.name.toLowerCase() === 'array') return roles
		else return []
	}

	//Retrieves the highest role in the roles hierarchy
	async GetHighestRole(ClientRoles){
		ClientRoles = await this.SanitizeRoles(ClientRoles)

		//roles object keys are written in hierarchal order, so loop from the top and check if client has that role
		var roles = Object.keys(this.roles)

		for(var i=0; i<roles.length; i++){
			if(ClientRoles.indexOf(roles[i]) !== -1) return roles[i]
		}

		//Default to none
		return ""
	}

	//Returns true if the roles array contains role
	async RolesHasRole(roles, role){
		roles = await this.SanitizeRoles(roles)

		if(roles.indexOf(role) !== -1) return true
		//Didn't exit early, assume didn't find
		return false
    }

	//Returns true if any of their roles has the specified permission
	async RolesHasPerm(roles, perm) {
		roles = await this.SanitizeRoles(roles)

		//Searches if any of the client's roles has the specified perm
		for(var i=0; i<roles.length; i++){
			var role = roles[i]
			if(this.roles[role] && (this.roles[role].indexOf(perm) !== -1)) return true
		}
		return false
	}

	/**
	 * Returns true if the client is hierarchically higher than the target
	 * @param {number} ClientUID 
	 * @param {number} TargetUID 
	 */
	async isClientOverpowerTarget(ClientUID, TargetUID){
		//Anyone can affect themselves
		//Placed up top for performance reasons (Most commands are clients affecting themselves)
		if(ClientUID == TargetUID) return true;
			
		let ClientRoles = await this.GetRolesFromUID(ClientUID)
		let TargetRoles = await this.GetRolesFromUID(TargetUID)

		// Check roles in hierarchical order
		//Admins have power over everyone
		if(ClientRoles.indexOf("admin") !== -1) return true
		//Client is a moderator
		else if(ClientRoles.indexOf("moderator") !== -1){
			//Moderators can't affect moderators or admins
			if(TargetRoles.indexOf("moderator") !== -1 || TargetRoles.indexOf("admin") !== -1) return false

			//No early exit, so assume target is below the moderator
			return true
		}
		
		//Default to false
		return false
	}

	/* Wrappers for simplicity */

	/**
	 * Wrapper | If the roles array has patron role
	 * @param {*} roles <number> Will get roles from user id
	 * @param {*} roles <array> Will the array of strings if it contains the role
	 */
	isPatron(roles){
		return this.RolesHasRole(roles, 'patron')
    }
    
    /**
	 * Wrapper | If the roles array has vip role
	 * @param {*} roles <number> Will get roles from user id
	 * @param {*} roles <array> Will the array of strings if it contains the role
	 */
	isVIP(roles){
		return this.RolesHasRole(roles, 'vip')
	}

	/**
	 * Wrapper | If the roles array has patron or vip role
	 * @param {*} roles <number> Will get roles from user id
	 * @param {*} roles <array> Will the array of strings if it contains the role
	 * @returns Boolean
	 */
	async isSupporter(roles){
		return await this.RolesHasRole(roles, 'patron') || await this.RolesHasRole(roles, 'vip')
	}

	/**
	 * Wrapper | If the roles array has moderator or admin role
	 * @param {*} roles <number> Will get roles from user id
	 * @param {*} roles <array> Will the array of strings if it contains the role
	 */
	async isModerator(roles){
		return await this.RolesHasRole(roles, 'moderator') || await this.isAdmin(roles)
	}

	/**
	 * Wrapper | If the roles array has admin role
	 * @param {*} roles <number> Will get roles from user id
	 * @param {*} roles <array> Will the array of strings if it contains the role
	 */
	isAdmin(roles){
		return this.RolesHasRole(roles, 'admin')
	}
}

module.exports = new RolesAPI();