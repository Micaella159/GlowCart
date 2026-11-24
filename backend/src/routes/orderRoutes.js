const crypto = require("crypto");
const express = require("express");
const { createHttpError } = require("../utils/httpError");
const { stripControlCharacters } = require("../utils/sanitizeText");
const createAuthenticate = require("../middleware/authenticate");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ORDER_TOTAL_CENTS = 999999999999;
const ORDER_SELECT = `
  SELECT id, user_id AS "userId", customer_name AS "customerName", phone,
    delivery_address AS "deliveryAddress", subtotal::text AS subtotal,
    total::text AS total, payment_method AS "paymentMethod",
    payment_status AS "paymentStatus", order_status AS "orderStatus",
    created_at AS "createdAt"
  FROM public.orders
`;
const ORDER_ITEM_SELECT = `
  SELECT id, order_id AS "orderId", product_id AS "productId",
    product_name AS name, image_url AS "imageUrl", unit_price::text AS "unitPrice",
    quantity, line_total::text AS "lineTotal"
  FROM public.order_items
`;

function validateCheckout(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "INVALID_CHECKOUT", "A JSON object is required.");
  }

  const customer = body.customer;
  const customerName = typeof customer?.name === "string"
    ? stripControlCharacters(customer.name).replace(/\s+/g, " ").trim()
    : "";
  const phone = typeof customer?.phone === "string"
    ? stripControlCharacters(customer.phone).replace(/\s+/g, " ").trim()
    : "";
  const deliveryAddress = typeof customer?.address === "string"
    ? stripControlCharacters(customer.address).replace(/\s+/g, " ").trim()
    : "";

  if (!customerName || customerName.length > 80) {
    throw createHttpError(400, "INVALID_CUSTOMER_NAME", "Enter a name of 1 to 80 characters.");
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (phone.length < 7 || phone.length > 20 || !/^[+0-9().\-\s]+$/.test(phone)
    || phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw createHttpError(400, "INVALID_PHONE", "Enter a valid phone number.");
  }
  if (deliveryAddress.length < 10 || deliveryAddress.length > 500) {
    throw createHttpError(400, "INVALID_ADDRESS", "Enter a delivery address of 10 to 500 characters.");
  }
  if (body.paymentMethod !== "COD") {
    throw createHttpError(400, "INVALID_PAYMENT_METHOD", "Cash on Delivery (COD) is the only supported payment method.");
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    throw createHttpError(400, "INVALID_ORDER_ITEMS", "An order must contain between 1 and 50 distinct products.");
  }

  const items = body.items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)
      || typeof item.productId !== "string" || !UUID_PATTERN.test(item.productId)
      || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw createHttpError(
        400,
        "INVALID_ORDER_ITEM",
        "Each item needs a valid productId and a whole-number quantity from 1 to 99.",
      );
    }
    return { productId: item.productId.toLowerCase(), quantity: item.quantity };
  });

  if (new Set(items.map((item) => item.productId)).size !== items.length) {
    throw createHttpError(400, "DUPLICATE_ORDER_ITEM", "Each product may appear only once in the order.");
  }

  return {
    customerName,
    phone,
    deliveryAddress,
    paymentMethod: "COD",
    items,
  };
}

function toCents(value) {
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents)
    || cents < 0 || Math.abs(amount * 100 - cents) > 0.000001) {
    throw createHttpError(503, "INVALID_PRODUCT_PRICE", "A catalog price is invalid.");
  }
  return cents;
}

function fromCents(cents) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function createRequestHash(input) {
  const canonicalInput = {
    customerName: input.customerName,
    phone: input.phone,
    deliveryAddress: input.deliveryAddress,
    paymentMethod: input.paymentMethod,
    items: [...input.items].sort((a, b) => a.productId.localeCompare(b.productId)),
  };
  return crypto.createHash("sha256").update(JSON.stringify(canonicalInput)).digest("hex");
}

async function loadOrder(database, orderId, userId) {
  const orderResult = await database.query(
    `${ORDER_SELECT} WHERE id = $1 AND user_id = $2`,
    [orderId, userId],
  );
  if (orderResult.rowCount !== 1) return null;

  const order = orderResult.rows[0];
  const itemsResult = await database.query(
    `${ORDER_ITEM_SELECT} WHERE order_id = $1 ORDER BY id`,
    [orderId],
  );
  return {
    id: order.id,
    customer: {
      name: order.customerName,
      phone: order.phone,
      address: order.deliveryAddress,
    },
    items: itemsResult.rows.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
  };
}

function createOrderRouter({ pool, env = process.env }) {
  const router = express.Router();
  const authenticate = createAuthenticate({ pool, env });

  router.post("/checkout", authenticate, async (req, res) => {
    const idempotencyKey = (req.get("Idempotency-Key") || "").trim().toLowerCase();
    if (!UUID_PATTERN.test(idempotencyKey)) {
      throw createHttpError(400, "INVALID_IDEMPOTENCY_KEY", "A UUID Idempotency-Key header is required.");
    }

    const input = validateCheckout(req.body);
    const requestHash = createRequestHash(input);
    let client;
    try {
      client = await pool.connect();
    } catch (error) {
      throw createHttpError(503, "CHECKOUT_UNAVAILABLE", "Checkout is temporarily unavailable.", error);
    }

    let transactionStarted = false;
    try {
      await client.query("BEGIN");
      transactionStarted = true;
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`glowcart:checkout:${req.user.id}:${idempotencyKey}`],
      );

      const existingResult = await client.query(
        `SELECT id, request_hash
         FROM public.orders
         WHERE user_id = $1 AND idempotency_key = $2`,
        [req.user.id, idempotencyKey],
      );
      if (existingResult.rowCount > 0) {
        if (existingResult.rows[0].request_hash !== requestHash) {
          throw createHttpError(
            409,
            "IDEMPOTENCY_KEY_REUSED",
            "This checkout key was already used with different order details.",
          );
        }

        const order = await loadOrder(client, existingResult.rows[0].id, req.user.id);
        if (!order) {
          throw createHttpError(503, "ORDERS_UNAVAILABLE", "The existing order could not be loaded.");
        }
        await client.query("COMMIT");
        transactionStarted = false;
        res.status(200).json({
          success: true,
          data: { order },
          meta: { requestId: req.requestId, idempotentReplay: true },
        });
        return;
      }

      const productIds = input.items.map((item) => item.productId);
      const productsResult = await client.query(
        `SELECT id, name, image_url AS "imageUrl", price, stock, is_active AS "isActive"
         FROM public.products
         WHERE id = ANY($1::uuid[])
         ORDER BY id
         FOR UPDATE`,
        [productIds],
      );
      if (productsResult.rowCount !== input.items.length) {
        throw createHttpError(404, "PRODUCT_NOT_FOUND", "One or more products are no longer available.");
      }

      const productsById = new Map(productsResult.rows.map((product) => [product.id.toLowerCase(), product]));
      let subtotalCents = 0;
      const orderItems = input.items.map((item) => {
        const product = productsById.get(item.productId);
        if (!product.isActive) {
          throw createHttpError(404, "PRODUCT_NOT_FOUND", "One or more products are no longer available.");
        }
        if (product.stock < item.quantity) {
          throw createHttpError(
            409,
            "INSUFFICIENT_STOCK",
            `${product.name} does not have enough stock for this quantity.`,
          );
        }

        const unitPriceCents = toCents(product.price);
        const lineTotalCents = unitPriceCents * item.quantity;
        subtotalCents += lineTotalCents;
        if (!Number.isSafeInteger(subtotalCents) || subtotalCents > MAX_ORDER_TOTAL_CENTS) {
          throw createHttpError(400, "ORDER_TOTAL_TOO_LARGE", "The order total exceeds the supported amount.");
        }

        return {
          ...item,
          product,
          unitPrice: fromCents(unitPriceCents),
          lineTotal: fromCents(lineTotalCents),
        };
      });

      const subtotal = fromCents(subtotalCents);
      const createdResult = await client.query(
        `INSERT INTO public.orders
          (user_id, idempotency_key, request_hash, customer_name, phone,
           delivery_address, subtotal, total, payment_method, payment_status, order_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'COD', 'pending', 'pending')
         RETURNING id`,
        [
          req.user.id,
          idempotencyKey,
          requestHash,
          input.customerName,
          input.phone,
          input.deliveryAddress,
          subtotal,
        ],
      );
      const orderId = createdResult.rows[0].id;

      for (const item of orderItems) {
        await client.query(
          `INSERT INTO public.order_items
            (order_id, product_id, product_name, image_url, unit_price, quantity, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            orderId,
            item.product.id,
            item.product.name,
            item.product.imageUrl,
            item.unitPrice,
            item.quantity,
            item.lineTotal,
          ],
        );

        const stockUpdate = await client.query(
          `UPDATE public.products
           SET stock = stock - $2, updated_at = NOW()
           WHERE id = $1 AND is_active = TRUE AND stock >= $2
           RETURNING stock`,
          [item.product.id, item.quantity],
        );
        if (stockUpdate.rowCount !== 1) {
          throw createHttpError(
            409,
            "INSUFFICIENT_STOCK",
            `${item.product.name} no longer has enough stock.`,
          );
        }
      }

      const order = await loadOrder(client, orderId, req.user.id);
      if (!order) {
        throw createHttpError(503, "ORDERS_UNAVAILABLE", "The order confirmation could not be loaded.");
      }
      await client.query("COMMIT");
      transactionStarted = false;
      res.status(201).json({
        success: true,
        data: { order },
        meta: { requestId: req.requestId, idempotentReplay: false },
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Checkout rollback failed.", rollbackError.code || "unknown");
        }
      }

      if (error.status) throw error;
      if (error.code === "23505") {
        throw createHttpError(409, "IDEMPOTENCY_KEY_REUSED", "This checkout key has already been used.");
      }
      throw createHttpError(503, "CHECKOUT_UNAVAILABLE", "Checkout is temporarily unavailable.", error);
    } finally {
      client.release();
    }
  });

  router.get("/orders", authenticate, async (req, res) => {
    try {
      const ordersResult = await pool.query(
        `${ORDER_SELECT} WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [req.user.id],
      );
      const orders = ordersResult.rows;
      const itemsResult = orders.length
        ? await pool.query(
          `${ORDER_ITEM_SELECT} WHERE order_id = ANY($1::uuid[]) ORDER BY id`,
          [orders.map((order) => order.id)],
        )
        : { rows: [] };
      const itemsByOrderId = new Map();
      for (const item of itemsResult.rows) {
        const items = itemsByOrderId.get(item.orderId) || [];
        items.push({
          id: item.id,
          productId: item.productId,
          name: item.name,
          imageUrl: item.imageUrl,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        });
        itemsByOrderId.set(item.orderId, items);
      }

      res.json({
        success: true,
        data: {
          orders: orders.map((order) => ({
            id: order.id,
            customer: {
              name: order.customerName,
              phone: order.phone,
              address: order.deliveryAddress,
            },
            items: itemsByOrderId.get(order.id) || [],
            subtotal: order.subtotal,
            total: order.total,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
            createdAt: order.createdAt,
          })),
        },
        meta: { count: orders.length, requestId: req.requestId },
      });
    } catch (error) {
      throw createHttpError(503, "ORDERS_UNAVAILABLE", "Order history is temporarily unavailable.", error);
    }
  });

  router.get("/orders/:id", authenticate, async (req, res) => {
    const { id } = req.params;
    if (!UUID_PATTERN.test(id)) {
      throw createHttpError(400, "INVALID_ORDER_ID", "The order id must be a valid UUID.");
    }

    try {
      const order = await loadOrder(pool, id, req.user.id);
      if (!order) throw createHttpError(404, "ORDER_NOT_FOUND", "The requested order was not found.");
      res.json({
        success: true,
        data: { order },
        meta: { requestId: req.requestId },
      });
    } catch (error) {
      if (error.status) throw error;
      throw createHttpError(503, "ORDERS_UNAVAILABLE", "Order details are temporarily unavailable.", error);
    }
  });

  return router;
}

module.exports = createOrderRouter;
