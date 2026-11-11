function validateSendMessage({ listingId, content }) {
  const errors = {};

  if (listingId === undefined || listingId === null || listingId === "") {
    errors.listingId = "Listing ID is required";
  } else {
    const idNum = Number(listingId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      errors.listingId = "Listing ID must be a valid positive integer";
    }
  }

  if (!content || typeof content !== "string" || !content.trim()) {
    errors.content = "Message content is required and cannot be empty";
  } else if (content.trim().length > 2000) {
    errors.content = "Message content must not exceed 2000 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function validateReplyMessage({ content }) {
  const errors = {};

  if (!content || typeof content !== "string" || !content.trim()) {
    errors.content = "Message content is required and cannot be empty";
  } else if (content.trim().length > 2000) {
    errors.content = "Message content must not exceed 2000 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateSendMessage,
  validateReplyMessage
};
