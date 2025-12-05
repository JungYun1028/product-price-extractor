"""API routes"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas import (
    ProductPriceExtractResponse,
    ProductPriceListResponse
)
from app.services import ProductPriceService
import logging
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/products/extract", response_model=ProductPriceExtractResponse)
async def extract_product_prices(
    file: UploadFile = File(...),
    store_name: Optional[str] = Query(None, description="Store name (optional)"),
    location: Optional[str] = Query(None, description="Location (optional)"),
    db: Session = Depends(get_db)
):
    """
    Upload image and extract product prices using OpenAI Vision API
    
    Args:
        file: Image file (JPEG, PNG, etc.)
        store_name: Optional store name
        location: Optional location
    
    Returns:
        Extracted products with prices
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image bytes
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Image file is empty")
        
        # Save image to uploads directory
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        image_filename = f"product_{timestamp}{file_extension}"
        image_path = uploads_dir / image_filename
        
        # Save image
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        
        relative_image_path = str(image_path.relative_to(Path.cwd()))
        
        # Prepare metadata
        metadata = {}
        if store_name:
            metadata["store_name"] = store_name
        if location:
            metadata["location"] = location
        metadata["original_filename"] = file.filename
        
        # Extract products using OpenAI Vision API
        service = ProductPriceService(db)
        products = service.extract_products_from_image(image_bytes, metadata=metadata)
        
        if not products:
            return ProductPriceExtractResponse(
                success=False,
                extracted_products=[],
                count=0,
                message="No products found in the image or extraction failed"
            )
        
        # Save to database
        saved_products = service.save_products(
            products,
            image_path=relative_image_path,
            metadata=metadata
        )
        
        logger.info(f"Successfully extracted and saved {len(saved_products)} products")
        
        return ProductPriceExtractResponse(
            success=True,
            extracted_products=saved_products,
            count=len(saved_products),
            message=f"Successfully extracted {len(saved_products)} products"
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Configuration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error extracting product prices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to extract product prices: {str(e)}")


@router.get("/api/products/list", response_model=ProductPriceListResponse)
async def get_product_list(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    product_name: Optional[str] = Query(None, description="Filter by product name (partial match)"),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of product prices
    
    Args:
        page: Page number (1-based)
        page_size: Number of items per page
        product_name: Filter by product name (optional)
    
    Returns:
        Paginated list of product prices
    """
    try:
        service = ProductPriceService(db)
        result = service.get_product_list(
            page=page,
            page_size=page_size,
            product_name_filter=product_name
        )
        return result
    except Exception as e:
        logger.error(f"Error getting product list: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get product list: {str(e)}")


