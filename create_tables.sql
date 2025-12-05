-- PostgreSQL table creation script for Product Price Extractor
-- Run this script after connecting to product_price_db database

-- Product price table for storing extracted product prices from images
CREATE TABLE IF NOT EXISTS product_price (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_path VARCHAR(500),
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_product_name ON product_price(product_name);
CREATE INDEX IF NOT EXISTS idx_extracted_at ON product_price(extracted_at);


