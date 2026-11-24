const express = require("express");
const pool = require("../config/db");
const { createHttpError } = require("../utils/httpError");

const router = express.Router();

router.get("/products", async (req, res) => {
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
      meta: { count: result.rowCount, requestId: req.requestId },
    });
  } catch (error) {
    throw createHttpError(
      503,
      "PRODUCTS_UNAVAILABLE",
      "Product data is temporarily unavailable.",
      error,
    );
  }
});

router.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    throw createHttpError(400, "INVALID_PRODUCT_ID", "The product id must be a valid UUID.");
  }

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
      WHERE id = $1 AND is_active = TRUE
    `, [id]);

    if (result.rowCount === 0) {
      throw createHttpError(404, "PRODUCT_NOT_FOUND", "The requested product was not found.");
    }

    res.json({
      success: true,
      data: { product: result.rows[0] },
      meta: { requestId: req.requestId },
    });
  } catch (error) {
    if (error.status) throw error;
    throw createHttpError(
      503,
      "PRODUCTS_UNAVAILABLE",
      "Product data is temporarily unavailable.",
      error,
    );
  }
});

module.exports = router;