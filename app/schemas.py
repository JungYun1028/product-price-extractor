"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ProductPriceResponse(BaseModel):
    """Response schema for product price"""
    id: int
    product_name: str
    price: float
    image_path: Optional[str]
    extracted_at: Optional[datetime]
    created_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ProductPriceExtractResponse(BaseModel):
    """Response schema for product price extraction"""
    success: bool
    extracted_products: List[ProductPriceResponse]
    count: int
    message: Optional[str] = None


class ProductPriceListResponse(BaseModel):
    """Response schema for paginated product price list"""
    items: List[ProductPriceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


