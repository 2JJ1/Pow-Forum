const buildErrorMessage = (errorType, objectName) => {
    const errorMessage = errorMessages[errorType].slice(16);

    return `Invalid request: ${objectName}${errorMessage}`;
}

const errorMessages = {
    missingRequiredFields: "Invalid request: required fields are missing",
    lengthInvalid: "Invalid request: length must be between 3-30 characters",
    biggerLengthInvalid: "Invalid request: description length must be between 3-250 characters",
    alreadyExists: "Invalid request: already exists",
    doesNotExist: "Invalid request: does not exist",
    specificFieldInvalid: "Invalid request: is invalid",
}

module.exports = buildErrorMessage;