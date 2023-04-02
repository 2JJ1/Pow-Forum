const mongoose = require('mongoose')

const Categories = mongoose.model("Categories")
const Subcategories = mongoose.model("Subcategories")

const ForumAPI = {
	GetSubcategories: async function(){
		return await Subcategories.find().lean()
	},

	//Returns the subcategory by category id
	GetSubcategory: async function(id){
		return await Subcategories.findById(id).lean()
	},

	GetCategories: async function(){
		return await Categories.find().lean()
	},
	
	isCategoryExist: async function(database){
		if(await this.GetSubcategory(database)) return true
		return false
	},

	permissionsCheck: function(requiredRoles, userRoles){
		//No required role specified, so no permissions required
		if(!requiredRoles || requiredRoles.length == 0) return true

		//Prevents error from non-logged in users
		if(requiredRoles.length > 0 && !userRoles) return false

		//Goes through each required role and checks if the user has that role
		for(let i=0; i<requiredRoles.length; i++){
			if(userRoles.indexOf(requiredRoles[i]) !== -1) return true
		}
		return false
	},
}

module.exports = ForumAPI;