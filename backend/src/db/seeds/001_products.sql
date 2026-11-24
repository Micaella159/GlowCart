BEGIN;

INSERT INTO public.products
  (id, name, description, price, image_url, category, stock)
VALUES
  (
    'c57b0202-e70f-4f3d-9eb9-7cb132897f3f',
    'Hydrating Face Serum',
    'A lightweight hydrating serum for a fresh, dewy everyday glow.',
    299.00,
    '/products/pink%20serum.jpg',
    'Skincare',
    30
  ),
  (
    'e407634c-6c28-4ad3-adc2-63586fe9a2d9',
    'Rose Glow Lip Tint',
    'A comfortable rose-colored tint that adds an easy wash of color.',
    199.00,
    '/products/matte%20liptint.jpg',
    'Makeup',
    25
  ),
  (
    '81d6139c-0181-4f02-bfdc-b1cf33f2ba49',
    'Daily Moisturizer',
    'A soft daily face moisturizer for a smooth, comfortable finish.',
    349.00,
    '/products/moisturizer.jpg',
    'Skincare',
    24
  ),
  (
    '7056092c-4071-4f96-ace2-fa3174f17124',
    'Soft Touch Makeup Brush Set',
    'A set of soft makeup brushes for everyday application.',
    249.00,
    '/products/makeup%20brush.jpg',
    'Accessories',
    30
  ),
  (
    '9cedb1e8-9298-49ec-8195-250fca972f8f',
    'Everyday SPF 50 Sunscreen',
    'A lightweight sunscreen for daily protection in your skincare routine.',
    399.00,
    '/products/sunscreen.jpg',
    'Skincare',
    22
  ),
  (
    '8dd2fc60-1bb2-4676-a643-ab518130a3de',
    'Soft Blush Palette',
    'A blendable blush palette with soft shades for a natural-looking flush.',
    279.00,
    '/products/trio%20palette.jpg',
    'Makeup',
    18
  ),
  (
    '6396d01b-057d-44a3-b2c3-bc441940a743',
    'Petal Pink Blush Compact',
    'A compact blush for a quick touch of soft pink color.',
    229.00,
    '/products/Blush.jpg',
    'Makeup',
    20
  ),
  (
    '6c78dc44-ff47-4937-b87f-021fd8f3609d',
    'Everyday Eyeshadow Trio',
    'Three easy-to-wear shades for a simple daytime eye look.',
    329.00,
    '/products/trio%20palette.jpg',
    'Makeup',
    16
  ),
  (
    'd4b01914-177d-40e4-8341-3654cd72f18c',
    'Dew Drop Face Serum',
    'A lightweight serum to layer into a simple morning or evening routine.',
    319.00,
    '/products/pink%20serum.jpg',
    'Skincare',
    21
  ),
  (
    'a2cec8b1-880f-4c3b-a38e-1de6a2a86368',
    'Velvet Matte Lip Color',
    'A smooth matte lip color in a wearable rosy shade.',
    219.00,
    '/products/matte%20liptint.jpg',
    'Makeup',
    27
  ),
  (
    '15f55bbb-0575-4dcd-b008-0719297080f6',
    'Nourishing Day Cream',
    'A daily cream with a comfortable texture for soft-feeling skin.',
    329.00,
    '/products/moisturizer.jpg',
    'Skincare',
    19
  ),
  (
    '83756e0d-9dfc-41cc-97b4-febd3afcb3c2',
    'Travel Makeup Brush Set',
    'A compact set of soft brushes for makeup touch-ups on the go.',
    189.00,
    '/products/makeup%20brush.jpg',
    'Accessories',
    26
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
