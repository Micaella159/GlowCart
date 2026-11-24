CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL,
  request_hash CHAR(64) NOT NULL CHECK (char_length(request_hash) = 64),
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 80),
  phone TEXT NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 20),
  delivery_address TEXT NOT NULL CHECK (char_length(delivery_address) BETWEEN 10 AND 500),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0 AND total = subtotal),
  payment_method TEXT NOT NULL DEFAULT 'COD' CHECK (payment_method = 'COD'),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (order_status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_user_idempotency_key_unique UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS orders_user_created_at_idx
  ON public.orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  image_url TEXT,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total = unit_price * quantity),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);
