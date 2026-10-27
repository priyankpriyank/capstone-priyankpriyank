const {
  validateListingCreation,
  validateListingUpdate
} = require("../src/validators/listing.validator");

describe("Listing Validator - validateListingCreation", () => {
  test("passes validation with all valid fields and price > 0", () => {
    const result = validateListingCreation({
      title: "Apple iPhone 13 Pro",
      description: "Excellent condition, 128GB, unlocked.",
      price: "650.00",
      categoryId: 1,
      photosCount: 2
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("UT-04: rejects listing when price is 0 (Req 3.2.1)", () => {
    const result = validateListingCreation({
      title: "Free Item",
      description: "Giving away for free.",
      price: 0,
      categoryId: 1,
      photosCount: 1
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBe("Price must be greater than zero");
  });

  test("UT-04: rejects listing when price is negative (Req 3.2.1)", () => {
    const result = validateListingCreation({
      title: "Negative Price Item",
      description: "Sample description",
      price: -10,
      categoryId: 1,
      photosCount: 1
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBe("Price must be greater than zero");
  });

  test("rejects when price is not a number", () => {
    const result = validateListingCreation({
      title: "Sample Item",
      description: "Sample description",
      price: "abc",
      categoryId: 1,
      photosCount: 1
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBe("Price must be a valid number");
  });

  test("rejects when title is missing or less than 3 characters", () => {
    const result = validateListingCreation({
      title: "ab",
      description: "Sample description",
      price: 50,
      categoryId: 1,
      photosCount: 1
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.title).toBe("Title must be at least 3 characters long");
  });

  test("rejects when description is missing", () => {
    const result = validateListingCreation({
      title: "Sample Item",
      description: "   ",
      price: 50,
      categoryId: 1,
      photosCount: 1
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.description).toBe("Listing description is required");
  });

  test("rejects when category is missing", () => {
    const result = validateListingCreation({
      title: "Sample Item",
      description: "Sample description",
      price: 50,
      categoryId: null,
      photosCount: 1
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.categoryId).toBe("Category selection is required");
  });

  test("rejects when photosCount is 0 (Req 4.1.2)", () => {
    const result = validateListingCreation({
      title: "Sample Item",
      description: "Sample description",
      price: 50,
      categoryId: 1,
      photosCount: 0
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.photos).toBe("At least one listing photo is required");
  });
});

describe("Listing Validator - validateListingUpdate (Week 6)", () => {
  test("passes validation with updated title, price > 0, and status", () => {
    const result = validateListingUpdate({
      title: "Updated Title Here",
      price: "499.99",
      status: "sold"
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test("rejects update when updated price is <= 0 (Req 3.2.1)", () => {
    const result = validateListingUpdate({
      price: 0
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBe("Price must be greater than zero");
  });

  test("rejects update when title is shorter than 3 characters", () => {
    const result = validateListingUpdate({
      title: "xy"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.title).toBe("Title must be at least 3 characters long");
  });

  test("rejects update when status is invalid", () => {
    const result = validateListingUpdate({
      status: "archived"
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.status).toBe("Status must be either 'active' or 'sold'");
  });
});
