const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./src/config/db");
const productRoutes = require("./src/routes/productRoutes");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
}));

app.use(express.json());

app.get("/api/v1", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to GlowCart API!",
  });
});

app.get("/api/v1/health", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "GlowCart database connected successfully!",
    });
  } catch (error) {
    console.error("Database health error:", error.message);

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_CONNECTION_ERROR",
        message: "Unable to connect to the database.",
      },
    });
  }
});

app.use("/api/v1", productRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`GlowCart API running at http://localhost:${PORT}`);
});