const express = require("express");
const crypto = require("crypto");
const pool = require("../config/db");

const router = express.Router();

router.get("/products", async (req, res) => {
  const requestId = crypto.randomUUID();

  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        description,
        price,
        image_url AS "imageUrl",
        category,
        stock
      FROM public.products
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: { products: result.rows },
      requestId,
    });
  } catch (error) {
    console.error("Products API error:", error.message);

    res.status(500).json({
      success: false,
      error: {
        code: "PRODUCTS_FETCH_ERROR",
        message: "Unable to retrieve products.",
      },
      requestId,
    });
  }
});

module.exports = router;