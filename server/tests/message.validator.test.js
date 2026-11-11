const {
  validateSendMessage,
  validateReplyMessage
} = require("../src/validators/message.validator");
const {
  encryptMessage,
  decryptMessage
} = require("../src/services/messageEncryption.service");

describe("Message Validator & Encryption Service (Week 7)", () => {
  describe("validateSendMessage", () => {
    test("passes with valid listingId and content", () => {
      const result = validateSendMessage({
        listingId: 5,
        content: "Hi! Is this item still available?"
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test("fails when listingId is missing", () => {
      const result = validateSendMessage({
        content: "Hello"
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.listingId).toBe("Listing ID is required");
    });

    test("fails when listingId is invalid (<= 0 or not integer)", () => {
      const result = validateSendMessage({
        listingId: "abc",
        content: "Hello"
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.listingId).toBe("Listing ID must be a valid positive integer");
    });

    test("fails when content is empty or whitespace", () => {
      const result = validateSendMessage({
        listingId: 1,
        content: "   "
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.content).toBe("Message content is required and cannot be empty");
    });

    test("fails when content exceeds 2000 characters", () => {
      const longText = "a".repeat(2001);
      const result = validateSendMessage({
        listingId: 1,
        content: longText
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.content).toBe("Message content must not exceed 2000 characters");
    });
  });

  describe("validateReplyMessage", () => {
    test("passes with valid message text", () => {
      const result = validateReplyMessage({ content: "Yes, I can meet tomorrow." });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test("fails when content is missing", () => {
      const result = validateReplyMessage({});
      expect(result.isValid).toBe(false);
      expect(result.errors.content).toBe("Message content is required and cannot be empty");
    });
  });

  describe("Message Encryption Service (Req 5.5, Common Terminology)", () => {
    test("encrypts and decrypts text accurately", () => {
      const plain = "Hello, will you accept $150 in cash?";
      const encrypted = encryptMessage(plain);

      expect(encrypted).not.toBe(plain);
      expect(encrypted.startsWith("enc:gcm:")).toBe(true);

      const decrypted = decryptMessage(encrypted);
      expect(decrypted).toBe(plain);
    });

    test("transparently handles legacy/unencrypted messages", () => {
      const seedMessage = "Is the laptop still available?";
      const decrypted = decryptMessage(seedMessage);
      expect(decrypted).toBe(seedMessage);
    });

    test("returns empty string for empty input", () => {
      expect(decryptMessage("")).toBe("");
      expect(decryptMessage(null)).toBe("");
    });
  });
});

