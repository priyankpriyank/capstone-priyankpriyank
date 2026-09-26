const { randomBytes } = require("crypto");

const resetTokens = new Map();

function createResetToken(userId) {
  const token = randomBytes(32).toString("hex");

  resetTokens.set(token, {
    userId,
    expiresAt: Date.now() + 15 * 60 * 1000
  });

  return token;
}

function getResetToken(token) {
  const resetData = resetTokens.get(token);

  if (!resetData) {
    return null;
  }

  if (Date.now() > resetData.expiresAt) {
    resetTokens.delete(token);
    return null;
  }

  return resetData;
}

function deleteResetToken(token) {
  resetTokens.delete(token);
}

module.exports = {
  createResetToken,
  getResetToken,
  deleteResetToken
};