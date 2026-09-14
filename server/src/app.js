const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// middleware 
app.use(cors());
app.use(express.json());


// simple route to check if the server is running
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "NexTo API is running"
  });
});


module.exports = app;