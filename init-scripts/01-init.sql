-- Database initialization script

-- Create read-only user (created with multiple host patterns)
CREATE USER 'readonly_user'@'%' IDENTIFIED BY 'readonly_password';
CREATE USER 'readonly_user'@'localhost' IDENTIFIED BY 'readonly_password';
CREATE USER 'readonly_user'@'172.%.%.%' IDENTIFIED BY 'readonly_password';

-- Grant permissions
GRANT SELECT ON *.* TO 'readonly_user'@'%';
GRANT SELECT ON *.* TO 'readonly_user'@'localhost';
GRANT SELECT ON *.* TO 'readonly_user'@'172.%.%.%';

-- Refresh privileges
FLUSH PRIVILEGES;

-- Create sample tables
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(50),
  in_stock BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add sample data
INSERT INTO users (username, email) VALUES
  ('user1', 'user1@example.com'),
  ('user2', 'user2@example.com'),
  ('admin', 'admin@example.com');

INSERT INTO products (name, description, price, category) VALUES
  ('Product 1', 'This is product 1', 19.99, 'Category A'),
  ('Product 2', 'This is product 2', 29.99, 'Category B'),
  ('Product 3', 'This is product 3', 39.99, 'Category A'); 