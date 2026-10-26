const express = require("express");
const { getActiveCategories } = require("../controllers/category.controller");

const router = express.Router();

router.get("/", getActiveCategories);

module.exports = router;
