"""Business logic services"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import ProductPrice
import logging
import json
import base64
from openai import OpenAI
from app.config import settings
from app.prompts import PRODUCT_PRICE_EXTRACTION_PROMPT

logger = logging.getLogger(__name__)


class ProductPriceService:
    """Service for product price extraction from images"""
    
    def __init__(self, db: Session):
        self.db = db
        self._openai_client = None
    
    @property
    def openai_client(self) -> OpenAI:
        """Lazy initialization of OpenAI client"""
        if self._openai_client is None:
            if not settings.openai_api_key:
                raise ValueError("OpenAI API key is not configured")
            self._openai_client = OpenAI(api_key=settings.openai_api_key)
        return self._openai_client
    
    def extract_products_from_image(self, image_bytes: bytes, metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Extract product names and prices from image using OpenAI Vision API
        
        Args:
            image_bytes: Image file bytes
            metadata: Optional metadata (store_name, location, etc.)
        
        Returns:
            List of dictionaries with product_name and price
        """
        try:
            # Encode image to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Use gpt-4o or gpt-4o-mini for vision (both support vision)
            model = "gpt-4o-mini"  # Can be changed to "gpt-4o" for better accuracy
            
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": PRODUCT_PRICE_EXTRACTION_PROMPT
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                temperature=0.1,  # Low temperature for accurate extraction
                response_format={"type": "json_object"}
            )
            
            result_text = response.choices[0].message.content
            result = json.loads(result_text)
            
            products = result.get("products", [])
            
            # Validate and normalize products
            validated_products = []
            for product in products:
                if isinstance(product, dict) and "product_name" in product and "price" in product:
                    try:
                        price = float(product["price"])
                        if price > 0:  # Only include products with valid price
                            validated_products.append({
                                "product_name": str(product["product_name"]).strip(),
                                "price": price
                            })
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid price format: {product.get('price')}")
                        continue
            
            logger.info(f"Successfully extracted {len(validated_products)} products from image")
            return validated_products
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {e}")
            logger.error(f"Response content: {result_text if 'result_text' in locals() else 'N/A'}")
            return []
        except Exception as e:
            logger.error(f"Error extracting products from image: {e}", exc_info=True)
            return []
    
    def save_products(self, products: List[Dict[str, Any]], image_path: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> List[ProductPrice]:
        """
        Save extracted products to database
        
        Args:
            products: List of product dictionaries with product_name and price
            image_path: Optional path to the uploaded image
            metadata: Optional metadata dictionary
        
        Returns:
            List of saved ProductPrice records
        """
        if not products:
            return []
        
        saved_records = []
        try:
            for product in products:
                record = ProductPrice(
                    product_name=product["product_name"],
                    price=product["price"],
                    image_path=image_path,
                    metadata=metadata or {}
                )
                self.db.add(record)
                saved_records.append(record)
            
            self.db.commit()
            
            # Refresh all records
            for record in saved_records:
                self.db.refresh(record)
            
            logger.info(f"Successfully saved {len(saved_records)} products to database")
            
        except Exception as e:
            logger.error(f"Error saving products: {e}", exc_info=True)
            self.db.rollback()
            raise
        
        return saved_records
    
    def get_product_list(
        self,
        page: int = 1,
        page_size: int = 20,
        product_name_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get paginated list of product prices
        
        Args:
            page: Page number (1-based)
            page_size: Number of items per page
            product_name_filter: Filter by product name (partial match)
        
        Returns:
            Dictionary with items, total, page, page_size, total_pages
        """
        query = self.db.query(ProductPrice)
        
        # Apply filters
        if product_name_filter:
            query = query.filter(ProductPrice.product_name.ilike(f"%{product_name_filter}%"))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        items = query.order_by(ProductPrice.extracted_at.desc()).offset(offset).limit(page_size).all()
        
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        
        logger.info(f"Retrieved {len(items)} products (total: {total}, page: {page})")
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }


