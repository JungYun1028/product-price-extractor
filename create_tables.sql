-- PostgreSQL table creation script for Product Price Extractor
-- Run this script after connecting to product_price_db database

-- Store master table
CREATE TABLE IF NOT EXISTS store (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(200) NOT NULL,
    channel VARCHAR(100),
    branch VARCHAR(100),
    manager VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_store_name ON store(store_name);

-- Product price table for storing extracted product prices from images
CREATE TABLE IF NOT EXISTS product_price (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_path VARCHAR(500),
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    confidence_score DOUBLE PRECISION,
    status VARCHAR(50),
    store_id BIGINT REFERENCES store(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_name ON product_price(product_name);
CREATE INDEX IF NOT EXISTS idx_extracted_at ON product_price(extracted_at);
CREATE INDEX IF NOT EXISTS idx_status ON product_price(status);
CREATE INDEX IF NOT EXISTS idx_store_id ON product_price(store_id);



