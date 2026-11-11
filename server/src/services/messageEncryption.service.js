const crypto = require("crypto");

// Derived key from JWT_SECRET or fallback
const SECRET = process.env.JWT_SECRET || "nexto-super-secure-encryption-secret-key-32b";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const PREFIX = "enc:gcm:";

// 32-byte key derived with SHA-256
const KEY = crypto.createHash("sha256").update(SECRET).digest();

/**
 * Encrypts a message using AES-256-GCM.
 * Stored format: "enc:gcm:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>"
 */
function encryptMessage(plainText) {
  if (typeof plainText !== "string") {
    plainText = String(plainText || "");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a message.
 * Supports encrypted strings with prefix as well as plain text (backward compatibility).
 */
function decryptMessage(storedText) {
  if (!storedText || typeof storedText !== "string") {
    return "";
  }

  // If not encrypted with our prefix, return as-is (e.g. seed data)
  if (!storedText.startsWith(PREFIX)) {
    return storedText;
  }

  try {
    const raw = storedText.slice(PREFIX.length);
    const [ivHex, authTagHex, encryptedHex] = raw.split(":");

    if (!ivHex || !authTagHex || !encryptedHex) {
      return storedText;
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // If decryption fails, return placeholder rather than crashing
    console.error("Message decryption error:", error.message);
    return "[Encrypted Message]";
  }
}

module.exports = {
  encryptMessage,
  decryptMessage
};
