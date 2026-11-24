const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { once } = require("node:events");
const express = require("express");
const bcrypt = require("bcryptjs");
const { test } = require("node:test");
const createAuthRouter = require("../src/routes/authRoutes");
const createAIRouter = require("../src/routes/aiRoutes");
const createOrderRouter = require("../src/routes/orderRoutes");
const { hashSessionToken } = require("../src/utils/sessionToken");
const { errorHandler } = require("../src/utils/httpError");

const TEST_SECRET = "test-only-auth-secret-0123456789abcdef";
const PRODUCT_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_PRODUCT_ID = "10000000-0000-4000-8000-000000000002";
const USER_ID = "20000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "20000000-0000-4000-8000-000000000002";
const USER_TOKEN = "test-user-session-token-that-is-long-enough-0001";
const OTHER_USER_TOKEN = "test-user-session-token-that-is-long-enough-0002";

function createFakePool(products = []) {
  const users = new Map();
  const sessions = new Map();

  async function query(sql, values = []) {
    if (sql.includes("FROM public.users") && sql.includes("WHERE lower(email) = $1")) {
      const user = users.get(values[0]);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (sql.includes("FROM public.auth_sessions AS s")) {
      const session = sessions.get(values[0]);
      const user = session && session.expires_at > new Date()
        ? [...users.values()].find((item) => item.id === session.user_id)
        : null;
      const row = user && session
        ? { id: user.id, email: user.email, name: user.name, expires_at: session.expires_at }
        : null;
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }

    if (sql.includes("DELETE FROM public.auth_sessions")) {
      const deleted = sessions.delete(values[0]);
      return { rows: [], rowCount: deleted ? 1 : 0 };
    }

    if (sql.includes("INSERT INTO public.auth_sessions")) {
      const [token_hash, user_id, expires_at] = values;
      sessions.set(token_hash, { user_id, expires_at });
      return { rows: [], rowCount: 1 };
    }

    if (sql.includes("FROM public.products") && sql.includes("id = ANY")) {
      const ids = new Set(values[0].map((id) => id.toLowerCase()));
      const rows = products.filter((item) => item.is_active && item.stock > 0
        && ids.has(item.id.toLowerCase()));
      return { rows, rowCount: rows.length };
    }

    if (sql.includes("FROM public.products") && sql.includes("ORDER BY created_at DESC")) {
      const rows = products.filter((item) => item.is_active && item.stock > 0);
      return { rows, rowCount: rows.length };
    }

    throw new Error(`Unexpected test query: ${sql}`);
  }

  return {
    users,
    sessions,
    query,
    async connect() {
      let stagedUser;
      let stagedSession;
      return {
        async query(sql, values = []) {
          if (sql === "BEGIN") return { rows: [], rowCount: 0 };
          if (sql === "COMMIT") {
            if (stagedUser) users.set(stagedUser.email, stagedUser);
            if (stagedSession) sessions.set(stagedSession.token_hash, stagedSession);
            return { rows: [], rowCount: 0 };
          }
          if (sql === "ROLLBACK") {
            stagedUser = null;
            stagedSession = null;
            return { rows: [], rowCount: 0 };
          }
          if (sql.includes("INSERT INTO public.users")) {
            const [name, email, password_hash] = values;
            if (users.has(email)) {
              const error = new Error("duplicate key");
              error.code = "23505";
              throw error;
            }
            stagedUser = { id: crypto.randomUUID(), name, email, password_hash };
            return {
              rows: [{ id: stagedUser.id, name, email }],
              rowCount: 1,
            };
          }
          if (sql.includes("INSERT INTO public.auth_sessions")) {
            const [token_hash, user_id, expires_at] = values;
            stagedSession = { token_hash, user_id, expires_at };
            return { rows: [], rowCount: 1 };
          }
          throw new Error(`Unexpected transaction query: ${sql}`);
        },
        release() {},
      };
    },
  };
}

function createOrderFakePool() {
  const users = [
    { id: USER_ID, email: "customer@example.com", name: "Test Customer" },
    { id: OTHER_USER_ID, email: "other@example.com", name: "Other Customer" },
  ];
  const sessions = new Map([
    [hashSessionToken(USER_TOKEN, TEST_SECRET), USER_ID],
    [hashSessionToken(OTHER_USER_TOKEN, TEST_SECRET), OTHER_USER_ID],
  ]);
  const products = new Map([
    [PRODUCT_ID, {
      id: PRODUCT_ID,
      name: "Hydrating Serum",
      imageUrl: "/products/serum.jpg",
      price: "299.00",
      stock: 5,
      isActive: true,
    }],
    [OTHER_PRODUCT_ID, {
      id: OTHER_PRODUCT_ID,
      name: "Inactive Product",
      imageUrl: null,
      price: "199.00",
      stock: 3,
      isActive: false,
    }],
  ]);
  let orders = [];
  let orderItems = [];

  async function query(sql, values = []) {
    if (sql.includes("FROM public.auth_sessions AS s")) {
      const userId = sessions.get(values[0]);
      const user = users.find((item) => item.id === userId);
      const row = user ? { ...user, expires_at: new Date(Date.now() + 60_000) } : null;
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.includes("FROM public.orders") && sql.includes("ORDER BY created_at DESC")) {
      const rows = orders.filter((item) => item.user_id === values[0]).map(toOrderRow);
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("FROM public.order_items") && sql.includes("ANY($1::uuid[])")) {
      const rows = orderItems.filter((item) => values[0].includes(item.orderId)).map(toItemRow);
      return { rows, rowCount: rows.length };
    }
    if (sql.includes("FROM public.orders") && sql.includes("WHERE id = $1 AND user_id = $2")) {
      const order = orders.find((item) => item.id === values[0] && item.user_id === values[1]);
      return { rows: order ? [toOrderRow(order)] : [], rowCount: order ? 1 : 0 };
    }
    if (sql.includes("FROM public.order_items") && sql.includes("WHERE order_id = $1")) {
      const rows = orderItems.filter((item) => item.orderId === values[0]).map(toItemRow);
      return { rows, rowCount: rows.length };
    }
    throw new Error(`Unexpected order test query: ${sql}`);
  }

  function toOrderRow(order) {
    return {
      id: order.id,
      userId: order.user_id,
      customerName: order.customer_name,
      phone: order.phone,
      deliveryAddress: order.delivery_address,
      subtotal: order.subtotal,
      total: order.total,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      createdAt: order.created_at,
    };
  }

  function toItemRow(item) {
    return {
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    };
  }

  return {
    products,
    query,
    async connect() {
      let stagedOrders;
      let stagedItems;
      let stagedProducts;
      return {
        async query(sql, values = []) {
          if (sql === "BEGIN") {
            stagedOrders = orders.map((item) => ({ ...item }));
            stagedItems = orderItems.map((item) => ({ ...item }));
            stagedProducts = new Map([...products].map(([id, item]) => [id, { ...item }]));
            return { rows: [], rowCount: 0 };
          }
          if (sql === "COMMIT") {
            orders = stagedOrders;
            orderItems = stagedItems;
            products.clear();
            for (const [id, item] of stagedProducts) products.set(id, item);
            return { rows: [], rowCount: 0 };
          }
          if (sql === "ROLLBACK") return { rows: [], rowCount: 0 };
          if (sql.includes("pg_advisory_xact_lock")) return { rows: [], rowCount: 1 };
          if (sql.includes("FROM public.orders") && sql.includes("idempotency_key = $2")) {
            const order = stagedOrders.find((item) => item.user_id === values[0]
              && item.idempotency_key === values[1]);
            return {
              rows: order ? [{ id: order.id, request_hash: order.request_hash }] : [],
              rowCount: order ? 1 : 0,
            };
          }
          if (sql.includes("FROM public.products") && sql.includes("FOR UPDATE")) {
            const rows = values[0].map((id) => stagedProducts.get(id)).filter(Boolean);
            return { rows: rows.map((item) => ({ ...item })), rowCount: rows.length };
          }
          if (sql.includes("INSERT INTO public.orders")) {
            const [user_id, idempotency_key, request_hash, customer_name, phone,
              delivery_address, subtotal] = values;
            const order = {
              id: crypto.randomUUID(),
              user_id,
              idempotency_key,
              request_hash,
              customer_name,
              phone,
              delivery_address,
              subtotal,
              total: subtotal,
              payment_method: "COD",
              payment_status: "pending",
              order_status: "pending",
              created_at: new Date().toISOString(),
            };
            stagedOrders.push(order);
            return { rows: [{ id: order.id }], rowCount: 1 };
          }
          if (sql.includes("INSERT INTO public.order_items")) {
            const [orderId, productId, name, imageUrl, unitPrice, quantity, lineTotal] = values;
            stagedItems.push({
              id: crypto.randomUUID(),
              orderId,
              productId,
              name,
              imageUrl,
              unitPrice,
              quantity,
              lineTotal,
            });
            return { rows: [], rowCount: 1 };
          }
          if (sql.includes("UPDATE public.products")) {
            const [id, quantity] = values;
            const product = stagedProducts.get(id);
            if (!product || !product.isActive || product.stock < quantity) {
              return { rows: [], rowCount: 0 };
            }
            product.stock -= quantity;
            return { rows: [{ stock: product.stock }], rowCount: 1 };
          }
          if (sql.includes("FROM public.orders") && sql.includes("WHERE id = $1 AND user_id = $2")) {
            const order = stagedOrders.find((item) => item.id === values[0] && item.user_id === values[1]);
            return { rows: order ? [toOrderRow(order)] : [], rowCount: order ? 1 : 0 };
          }
          if (sql.includes("FROM public.order_items") && sql.includes("WHERE order_id = $1")) {
            const rows = stagedItems.filter((item) => item.orderId === values[0]).map(toItemRow);
            return { rows, rowCount: rows.length };
          }
          throw new Error(`Unexpected order transaction query: ${sql}`);
        },
        release() {},
      };
    },
  };
}

async function startTestServer({ pool, env, fetchImpl, orderRoutes = false }) {
  const app = express();
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    next();
  });
  app.use(express.json());
  app.use("/api/v1/auth", createAuthRouter({ pool, env }));
  app.use("/api/v1/ai", createAIRouter({ pool, env, fetchImpl }));
  if (orderRoutes) app.use("/api/v1", createOrderRouter({ pool, env }));
  app.use(errorHandler);

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/api/v1`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

async function postJson(url, body, token) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function checkoutPayload(quantity = 2) {
  return {
    customer: {
      name: "Test Customer",
      phone: "+639171234567",
      address: "123 Sample Street, Quezon City",
    },
    paymentMethod: "COD",
    items: [{ productId: PRODUCT_ID, quantity }],
  };
}

test("auth registration, duplicate protection, login, me, and logout", async (t) => {
  const pool = createFakePool();
  const server = await startTestServer({
    pool,
    env: { AUTH_TOKEN_SECRET: TEST_SECRET, AUTH_SESSION_TTL_HOURS: "2" },
  });
  t.after(server.close);

  const invalid = await postJson(`${server.baseUrl}/auth/register`, {
    name: "Test User",
    email: "not-an-email",
    password: "valid-password",
  });
  assert.equal(invalid.status, 400);

  const registration = await postJson(`${server.baseUrl}/auth/register`, {
    name: "Test User",
    email: "Test@example.com",
    password: "correct-horse-battery",
  });
  assert.equal(registration.status, 201);
  const registered = await registration.json();
  assert.equal(registered.success, true);
  assert.equal(registered.data.user.email, "test@example.com");
  assert.ok(registered.data.token);
  assert.equal(registered.data.user.password_hash, undefined);
  assert.notEqual(pool.users.get("test@example.com").password_hash, "correct-horse-battery");
  assert.equal(pool.sessions.has(registered.data.token), false);
  assert.equal(await bcrypt.compare(
    "correct-horse-battery",
    pool.users.get("test@example.com").password_hash,
  ), true);

  const duplicate = await postJson(`${server.baseUrl}/auth/register`, {
    name: "Test User",
    email: "TEST@example.com",
    password: "another-password",
  });
  assert.equal(duplicate.status, 409);

  const wrongPassword = await postJson(`${server.baseUrl}/auth/login`, {
    email: "test@example.com",
    password: "incorrect-password",
  });
  assert.equal(wrongPassword.status, 401);

  const login = await postJson(`${server.baseUrl}/auth/login`, {
    email: "TEST@example.com",
    password: "correct-horse-battery",
  });
  assert.equal(login.status, 200);
  const loggedIn = await login.json();

  const unauthenticated = await fetch(`${server.baseUrl}/auth/me`);
  assert.equal(unauthenticated.status, 401);
  const unauthenticatedLogout = await postJson(`${server.baseUrl}/auth/logout`, {});
  assert.equal(unauthenticatedLogout.status, 401);

  const me = await fetch(`${server.baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${loggedIn.data.token}` },
  });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).data.user.email, "test@example.com");

  const logout = await postJson(`${server.baseUrl}/auth/logout`, {}, loggedIn.data.token);
  assert.equal(logout.status, 200);
  assert.equal((await logout.json()).data.loggedOut, true);

  const revoked = await fetch(`${server.baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${loggedIn.data.token}` },
  });
  assert.equal(revoked.status, 401);
});

test("AI discovery handles missing credentials, invalid prompts, and database-verified recommendations", async (t) => {
  const product = {
    id: PRODUCT_ID,
    name: "Daily Moisturizer",
    description: "Light moisturizer for daily use.",
    price: "349.00",
    imageUrl: "/products/moisturizer.jpg",
    category: "Skincare",
    stock: 12,
    is_active: true,
  };
  const pool = createFakePool([product]);
  let providerCalls = 0;
  const fetchImpl = async (url, options) => {
    providerCalls += 1;
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-provider-key");
    const request = JSON.parse(options.body);
    const userMessage = JSON.parse(request.messages[1].content);
    assert.equal(userMessage.catalog[0].price, product.price);
    return {
      ok: true,
      async json() {
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                recommendations: [{
                  id: PRODUCT_ID,
                  reason: "This moisturizer fits the stated daily skincare goal.",
                  price: "0.01",
                  stock: 9999,
                }],
              }),
            },
          }],
        };
      },
    };
  };

  const missingKeyServer = await startTestServer({ pool, env: {}, fetchImpl });
  t.after(missingKeyServer.close);
  const missingKey = await postJson(`${missingKeyServer.baseUrl}/ai/discovery`, {
    prompt: "A gentle moisturizer",
  });
  assert.equal(missingKey.status, 503);
  assert.equal((await missingKey.json()).error.code, "AI_NOT_CONFIGURED");
  assert.equal(providerCalls, 0);

  const server = await startTestServer({
    pool,
    env: { OPENAI_API_KEY: "test-provider-key", OPENAI_MODEL: "test-model" },
    fetchImpl,
  });
  t.after(server.close);

  const invalidPrompt = await postJson(`${server.baseUrl}/ai/discovery`, { prompt: "no" });
  assert.equal(invalidPrompt.status, 400);
  const invalidLimit = await postJson(`${server.baseUrl}/ai/discovery`, {
    prompt: "A gentle moisturizer for dry skin",
    limit: "3",
  });
  assert.equal(invalidLimit.status, 400);

  const response = await postJson(`${server.baseUrl}/ai/discovery`, {
    prompt: "A gentle moisturizer for dry skin",
    limit: 3,
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.meta.count, 1);
  assert.equal(result.data.recommendations[0].product.price, "349.00");
  assert.equal(result.data.recommendations[0].product.stock, 12);
  assert.equal(result.data.recommendations[0].product.id, PRODUCT_ID);
  assert.equal(result.data.recommendations[0].price, undefined);
  assert.equal(providerCalls, 1);
});

test("AI discovery returns a safe error when the provider fails", async (t) => {
  const server = await startTestServer({
    pool: createFakePool([{
      id: PRODUCT_ID,
      name: "Daily Moisturizer",
      description: "",
      price: "349.00",
      imageUrl: null,
      category: "Skincare",
      stock: 12,
      is_active: true,
    }]),
    env: { OPENAI_API_KEY: "test-provider-key" },
    fetchImpl: async () => ({ ok: false, status: 429 }),
  });
  t.after(server.close);

  const response = await postJson(`${server.baseUrl}/ai/discovery`, {
    prompt: "A gentle moisturizer for dry skin",
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "AI_PROVIDER_UNAVAILABLE");
});

test("COD checkout validates stock, is idempotent, and restricts order ownership", async (t) => {
  const pool = createOrderFakePool();
  const server = await startTestServer({
    pool,
    env: { AUTH_TOKEN_SECRET: TEST_SECRET },
    orderRoutes: true,
  });
  t.after(server.close);

  const unauthenticated = await postJson(
    `${server.baseUrl}/checkout`,
    checkoutPayload(),
  );
  assert.equal(unauthenticated.status, 401);
  const unauthenticatedHistory = await fetch(`${server.baseUrl}/orders`);
  assert.equal(unauthenticatedHistory.status, 401);

  const checkoutRequest = (body) => fetch(`${server.baseUrl}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${USER_TOKEN}`,
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  const invalidQuantity = await checkoutRequest(checkoutPayload(0));
  assert.equal(invalidQuantity.status, 400);

  const missingProduct = checkoutPayload();
  missingProduct.items[0].productId = "10000000-0000-4000-8000-000000000003";
  const missing = await checkoutRequest(missingProduct);
  assert.equal(missing.status, 404);

  const inactiveProduct = checkoutPayload();
  inactiveProduct.items[0].productId = OTHER_PRODUCT_ID;
  const inactive = await checkoutRequest(inactiveProduct);
  assert.equal(inactive.status, 404);

  const insufficient = await checkoutRequest(checkoutPayload(6));
  assert.equal(insufficient.status, 409);
  assert.equal(pool.products.get(PRODUCT_ID).stock, 5);

  const key = "30000000-0000-4000-8000-000000000001";
  const submit = (body) => fetch(`${server.baseUrl}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${USER_TOKEN}`,
      "Idempotency-Key": key,
    },
    body: JSON.stringify(body),
  });
  const createdResponse = await submit(checkoutPayload());
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  const order = created.data.order;
  assert.equal(order.total, "598.00");
  assert.equal(order.paymentMethod, "COD");
  assert.equal(order.paymentStatus, "pending");
  assert.equal(order.items[0].imageUrl, "/products/serum.jpg");
  assert.equal(order.items[0].unitPrice, "299.00");
  assert.equal(pool.products.get(PRODUCT_ID).stock, 3);

  const replayResponse = await submit(checkoutPayload());
  assert.equal(replayResponse.status, 200);
  const replay = await replayResponse.json();
  assert.equal(replay.meta.idempotentReplay, true);
  assert.equal(replay.data.order.id, order.id);
  assert.equal(pool.products.get(PRODUCT_ID).stock, 3);

  const reusedKeyResponse = await submit(checkoutPayload(1));
  assert.equal(reusedKeyResponse.status, 409);

  const historyResponse = await fetch(`${server.baseUrl}/orders`, {
    headers: { Authorization: `Bearer ${USER_TOKEN}` },
  });
  assert.equal(historyResponse.status, 200);
  assert.equal((await historyResponse.json()).data.orders.length, 1);

  const foreignOrderResponse = await fetch(`${server.baseUrl}/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${OTHER_USER_TOKEN}` },
  });
  assert.equal(foreignOrderResponse.status, 404);
});
