const pool = require("../config/database");
const bcrypt = require("bcrypt");
const { validateRegistration } = require("../validators/auth.validator");

module.exports = {
  register
};