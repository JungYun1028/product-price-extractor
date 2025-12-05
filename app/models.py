"""Database models"""
from sqlalchemy import Column, Integer, String, DECIMAL, TIMESTAMP, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class ProductPrice(Base):
    """Product price information extracted from images"""
    __tablename__ = "product_price"
    
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String(200), nullable=False, index=True)
    price = Column(DECIMAL(10, 2), nullable=False)
    image_path = Column(String(500))  # Path to uploaded image
    extracted_at = Column(TIMESTAMP, server_default=func.current_timestamp(), index=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    metadata = Column(JSONB)  # Additional metadata (store, location, etc.)
    
    # Indexes
    __table_args__ = (
        Index('idx_product_name', 'product_name'),
        Index('idx_extracted_at', 'extracted_at'),
    )


