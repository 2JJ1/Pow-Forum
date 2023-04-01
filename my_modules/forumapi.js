const mongoose = require('mongoose')

const CategoryGroups = mongoose.model("CategoryGroups")
const Categories = mongoose.model("Categories")

const ForumAPI = {
	GetCategories: async function(){
		return await Categories.find().lean()
	},

	//Returns the category from database name
	GetCategory: async function(database){
		return await Categories.findOne({database}).lean()
	},

	GetCategoryGroups: async function(){
		return await CategoryGroups.find().lean()
	},
	
	isCategoryExist: async function(database){
		if(await this.GetCategory(database)) return true
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