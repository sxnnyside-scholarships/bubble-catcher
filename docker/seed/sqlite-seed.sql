-- Bubble Catcher SQLite Sandbox Seed Data

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  age INTEGER,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT,
  stock INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  ordered_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO users (name, email, age, role) VALUES
  ('Alice Johnson', 'alice@example.com', 28, 'admin'),
  ('Bob Smith', 'bob@example.com', 34, 'user'),
  ('Carol Williams', 'carol@example.com', 22, 'user'),
  ('David Brown', 'david@example.com', 45, 'moderator'),
  ('Eva Martinez', 'eva@example.com', 31, 'user'),
  ('Frank Lee', 'frank@example.com', 27, 'user'),
  ('Grace Kim', 'grace@example.com', 39, 'admin'),
  ('Henry Davis', 'henry@example.com', 53, 'user'),
  ('Iris Wilson', 'iris@example.com', 26, 'user'),
  ('Jack Taylor', 'jack@example.com', 41, 'moderator');

INSERT INTO products (name, price, category, stock) VALUES
  ('Laptop Pro 15"', 1299.99, 'Electronics', 50),
  ('Wireless Mouse', 29.99, 'Accessories', 200),
  ('Mechanical Keyboard', 89.99, 'Accessories', 150),
  ('USB-C Hub', 49.99, 'Accessories', 100),
  ('Monitor 27" 4K', 449.99, 'Electronics', 30),
  ('Webcam HD', 79.99, 'Electronics', 75),
  ('Desk Lamp LED', 34.99, 'Office', 120),
  ('Standing Desk', 599.99, 'Furniture', 25),
  ('Ergonomic Chair', 399.99, 'Furniture', 40),
  ('Notebook Pack', 12.99, 'Office', 500);

INSERT INTO orders (user_id, product_id, quantity, total_price, status) VALUES
  (1, 1, 1, 1299.99, 'delivered'),
  (1, 3, 2, 179.98, 'delivered'),
  (2, 2, 1, 29.99, 'shipped'),
  (3, 5, 1, 449.99, 'pending'),
  (4, 8, 1, 599.99, 'delivered'),
  (5, 10, 5, 64.95, 'delivered'),
  (6, 4, 2, 99.98, 'shipped'),
  (7, 6, 1, 79.99, 'pending'),
  (8, 9, 1, 399.99, 'delivered'),
  (9, 7, 3, 104.97, 'shipped'),
  (10, 1, 1, 1299.99, 'pending'),
  (2, 3, 1, 89.99, 'delivered'),
  (3, 2, 3, 89.97, 'delivered'),
  (5, 6, 1, 79.99, 'shipped');

INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
  (1, 1, 5, 'Excellent laptop, very fast!'),
  (1, 3, 4, 'Great keyboard, a bit loud.'),
  (2, 2, 3, 'Decent mouse, nothing special.'),
  (4, 8, 5, 'Best standing desk I have owned.'),
  (5, 10, 4, 'Good quality notebooks.'),
  (8, 9, 5, 'Very comfortable chair.'),
  (3, 5, 4, 'Beautiful monitor, great colors.'),
  (9, 7, 3, 'Lamp works fine, basic design.'),
  (6, 4, 4, 'Handy USB-C hub, all ports work.'),
  (10, 1, 5, 'Top-notch performance.');
