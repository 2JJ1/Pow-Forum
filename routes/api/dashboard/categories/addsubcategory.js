const router = require('express').Router();
const mongoose = require("mongoose");
const escape = require("escape-html");

const buildErrorMessage = require("../../../../my_modules/errorMessages")

const Categories = mongoose.model("Categories");
const Subcategories = mongoose.model("Subcategories");
const ForumAuditLogs = mongoose.model("ForumAuditLogs");

// 	/api/dashboard/categories

router.post("/addsubcategory", async (req, res, next) => {
	try {
		const { name, description, requiredRoles, group } = req.body;

		if(!name || !description || !group) {
			return res.status(400).send({success: false, error: buildErrorMessage("missingRequiredFields", "subcategory")});
		}

		const sanitizedCategoryName = escape(name.trim());
		const sanitizedDescription = escape(description.trim());

		if(sanitizedCategoryName.length < 3 || sanitizedCategoryName.length > 30) {
			return res.status(400).send({success: false, error: buildErrorMessage("lengthInvalid", "subcategory name")});
		}
		if(sanitizedDescription.length < 3 || sanitizedDescription.length > 250) {
			return res.status(400).send({success: false, error: buildErrorMessage("biggerLengthInvalid", "subcategory description")});
		}

		// Process required roles
		let sanitizedRequiredRoles = requiredRoles.trim();
		if(sanitizedRequiredRoles) {
			sanitizedRequiredRoles = sanitizedRequiredRoles.split(",").map(role => role.trim());
		}
		else {
			sanitizedRequiredRoles = [];
		}
		if(sanitizedRequiredRoles.length === 0) {
			sanitizedRequiredRoles = undefined;
		}

		// Check if the group category exists
		const category = await Categories.findOne({name: group});
		if(!category) return res.status(400).send({success: false, error: buildErrorMessage("doesNotExist", "category")});

		// Check if the subcategory already exists
		if(await Subcategories.findOne({name: sanitizedCategoryName})) {
			return res.status(400).send({success: false, error: buildErrorMessage("alreadyExists", "subcategory")});
		}

		// Create new subcategory
		await new Subcategories({
			name: sanitizedCategoryName,
			description: sanitizedDescription,
			requiredRoles: sanitizedRequiredRoles,
			category: category.name
		}).save();

		//Log audit
		new ForumAuditLogs({
			time: Date.now(),
			type: "Add subcategory",
			byUID: req.session.uid,
			content: {
				category: sanitizedCategoryName,
				group: category.name,
			},
		}).save();

		res.send({success: true});
	}
	catch(e) {
		next(e);
	}
});

module.exports = router;