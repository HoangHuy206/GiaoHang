-- Schema for delivery app
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'driver', 'shop') NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  cccd VARCHAR(20),
  gender VARCHAR(10),
  vehicle VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  user_id INT, -- Link to a user account acting as admin for this shop
  image_url VARCHAR(255),
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255),
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shop_id INT NOT NULL,
  driver_id INT,
  status ENUM('pending', 'confirmed', 'finding_driver', 'driver_assigned', 'picked_up', 'delivered', 'cancelled') DEFAULT 'pending',
  total_price DECIMAL(10, 2) NOT NULL,
  delivery_address TEXT,
  delivery_lat DECIMAL(10, 8),
  delivery_lng DECIMAL(11, 8),
  pickup_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shop_id) REFERENCES shops(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INT NOT NULL,
  shop_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, shop_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shop_id) REFERENCES shops(id)
);