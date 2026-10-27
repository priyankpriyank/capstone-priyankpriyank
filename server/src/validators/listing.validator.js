function validateListingCreation({ title, description, price, categoryId, photosCount = 0 }) {
  const errors = {};

  if (!title || !title.trim()) {
    errors.title = "Listing title is required";
  } else if (title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (title.trim().length > 120) {
    errors.title = "Title must not exceed 120 characters";
  }

  if (!description || !description.trim()) {
    errors.description = "Listing description is required";
  }

  if (price === undefined || price === null || price === "") {
    errors.price = "Listing price is required";
  } else {
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
      errors.price = "Price must be a valid number";
    } else if (numPrice <= 0) {
      // Requirement 3.2.1: The price of all listings must be greater than zero
      errors.price = "Price must be greater than zero";
    }
  }

  if (!categoryId) {
    errors.categoryId = "Category selection is required";
  }

  if (photosCount < 1) {
    // Requirement 4.1.2: The system must allow the user to upload at least one listing photo
    errors.photos = "At least one listing photo is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function validateListingUpdate({ title, description, price, categoryId, status }) {
  const errors = {};

  if (title !== undefined) {
    if (!title || !title.trim()) {
      errors.title = "Listing title cannot be empty";
    } else if (title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters long";
    } else if (title.trim().length > 120) {
      errors.title = "Title must not exceed 120 characters";
    }
  }

  if (description !== undefined && (!description || !description.trim())) {
    errors.description = "Listing description cannot be empty";
  }

  if (price !== undefined) {
    if (price === null || price === "") {
      errors.price = "Listing price cannot be empty";
    } else {
      const numPrice = Number(price);
      if (isNaN(numPrice)) {
        errors.price = "Price must be a valid number";
      } else if (numPrice <= 0) {
        // Requirement 3.2.1: The price of all listings must be greater than zero
        errors.price = "Price must be greater than zero";
      }
    }
  }

  if (categoryId !== undefined && !categoryId) {
    errors.categoryId = "Valid category selection is required";
  }

  if (status !== undefined && !["active", "sold"].includes(status)) {
    errors.status = "Status must be either 'active' or 'sold'";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

module.exports = {
  validateListingCreation,
  validateListingUpdate
};
