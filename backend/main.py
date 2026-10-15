"""
EcoCoin FastAPI Backend Service
Provides Computer Vision inference, IoT Digital Twin telemetry, and deposit verification.
"""

import os
import uuid
import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from vision import classifier
from verification import evaluate_deposit, calculate_manual_approval, REWARD_POLICY

app = FastAPI(
    title="EcoCoin AI & Digital Twin Service",
    version="1.0.0",
    description="Campus waste management Computer Vision classification and Digital Twin IoT service."
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory mock store for demo/standalone operation
CAMPUS_BINS_DB = [
    {
        "id": "b1111111-1111-1111-1111-111111111111",
        "bin_code": "BIN-CAMPUS-001",
        "name": "Turing Plaza Plastic Hub",
        "category": "plastic",
        "campus_zone": "North Quad",
        "building": "Turing Hall",
        "floor": "Ground Level",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "fill_level_pct": 38,
        "capacity_liters": 120,
        "battery_level_pct": 94,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=4)).isoformat(),
    },
    {
        "id": "b2222222-2222-2222-2222-222222222222",
        "bin_code": "BIN-CAMPUS-002",
        "name": "Library West Paper Depot",
        "category": "paper",
        "campus_zone": "Central Quad",
        "building": "Main Library",
        "floor": "1st Floor",
        "latitude": 37.7755,
        "longitude": -122.4182,
        "fill_level_pct": 82,
        "capacity_liters": 240,
        "battery_level_pct": 88,
        "status": "NEAR_FULL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=18)).isoformat(),
    },
    {
        "id": "b3333333-3333-3333-3333-333333333333",
        "bin_code": "BIN-CAMPUS-003",
        "name": "Student Union Can & Metal Vault",
        "category": "metal",
        "campus_zone": "Student Life Zone",
        "building": "Student Union",
        "floor": "Food Court",
        "latitude": 37.7738,
        "longitude": -122.4175,
        "fill_level_pct": 45,
        "capacity_liters": 120,
        "battery_level_pct": 99,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat(),
    },
    {
        "id": "b4444444-4444-4444-4444-444444444444",
        "bin_code": "BIN-CAMPUS-004",
        "name": "Edison Cafe Glass Return",
        "category": "glass",
        "campus_zone": "Engineering Zone",
        "building": "Edison Complex",
        "floor": "Courtyard",
        "latitude": 37.7761,
        "longitude": -122.4165,
        "fill_level_pct": 94,
        "capacity_liters": 90,
        "battery_level_pct": 76,
        "status": "FULL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=26)).isoformat(),
    },
    {
        "id": "b5555555-5555-5555-5555-555555555555",
        "bin_code": "BIN-CAMPUS-005",
        "name": "Carson Pavilion Organic Compost",
        "category": "organic",
        "campus_zone": "Science Quad",
        "building": "Carson Pavilion",
        "floor": "Greenhouse Entry",
        "latitude": 37.7768,
        "longitude": -122.4201,
        "fill_level_pct": 62,
        "capacity_liters": 180,
        "battery_level_pct": 91,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=6)).isoformat(),
    },
    {
        "id": "b6666666-6666-6666-6666-666666666666",
        "bin_code": "BIN-CAMPUS-006",
        "name": "Dormitory Quad Multi-Stream Station",
        "category": "multi-stream",
        "campus_zone": "Residential Village",
        "building": "Oak Hall",
        "floor": "Lobby",
        "latitude": 37.7731,
        "longitude": -122.4212,
        "fill_level_pct": 22,
        "capacity_liters": 360,
        "battery_level_pct": 95,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=1)).isoformat(),
    },
    {
        "id": "b7777777-7777-7777-7777-777777777777",
        "bin_code": "BIN-CAMPUS-007",
        "name": "Athletics Hydration & Bottle Drop",
        "category": "plastic",
        "campus_zone": "Athletics Complex",
        "building": "Field House",
        "floor": "Gate 2",
        "latitude": 37.7720,
        "longitude": -122.4188,
        "fill_level_pct": 79,
        "capacity_liters": 150,
        "battery_level_pct": 83,
        "status": "NEAR_FULL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=12)).isoformat(),
    },
    {
        "id": "b8888888-8888-8888-8888-888888888888",
        "bin_code": "BIN-CAMPUS-008",
        "name": "Arts Workshop Scrap & General Hub",
        "category": "general",
        "campus_zone": "Arts District",
        "building": "Sculpture Hall",
        "floor": "Loading Bay",
        "latitude": 37.7742,
        "longitude": -122.4225,
        "fill_level_pct": 15,
        "capacity_liters": 200,
        "battery_level_pct": 65,
        "status": "MAINTENANCE",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(days=3)).isoformat(),
    }
]

DEPOSITS_REVIEW_QUEUE = [
    {
        "id": "dep-sample-101",
        "student_id": "std-demo-01",
        "student_name": "Maya Lin",
        "bin_id": "b2222222-2222-2222-2222-222222222222",
        "bin_name": "Library West Paper Depot",
        "reported_category": "paper",
        "ai_predicted_category": "plastic",
        "ai_confidence": 0.74,
        "image_url": "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=500&auto=format&fit=crop",
        "status": "NEEDS_STAFF_REVIEW",
        "verification_notes": "Stream Mismatch: Deposited into 'paper' bin, but AI detected 'plastic' with 74% confidence.",
        "created_at": (datetime.datetime.now() - datetime.timedelta(minutes=45)).isoformat(),
    },
    {
        "id": "dep-sample-102",
        "student_id": "std-demo-02",
        "student_name": "Alex Rivera",
        "bin_id": "b5555555-5555-5555-5555-555555555555",
        "bin_name": "Carson Pavilion Organic Compost",
        "reported_category": "organic",
        "ai_predicted_category": "organic",
        "ai_confidence": 0.68,
        "image_url": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&auto=format&fit=crop",
        "status": "NEEDS_STAFF_REVIEW",
        "verification_notes": "Low confidence score (68%). AI uncertain if container is compostable bag.",
        "created_at": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat(),
    }
]

# Request / Response Schemas
class ManualVerifyRequest(BaseModel):
    decision: str = Field(..., description="'APPROVE' or 'REJECT'")
    approved_category: Optional[str] = None
    notes: Optional[str] = None
    staff_id: Optional[str] = "staff-admin-01"

class TelemetryUpdateRequest(BaseModel):
    fill_level_pct: Optional[int] = None
    status: Optional[str] = None
    battery_level_pct: Optional[int] = None


@app.get("/")
def health_check():
    return {
        "service": "EcoCoin AI & Digital Twin Service",
        "status": "healthy",
        "vision_engine": "Ultralytics YOLO" if classifier.yolo_model else "Hybrid Vision Engine",
        "reward_policy": REWARD_POLICY,
        "smart_bins_count": len(CAMPUS_BINS_DB),
        "review_queue_count": len(DEPOSITS_REVIEW_QUEUE)
    }

# -----------------------------------------------------------------------------
# 1. Computer Vision Classification Endpoint
# -----------------------------------------------------------------------------
@app.post("/api/cv/classify")
async def classify_waste_image(
    file: UploadFile = File(...),
    target_bin_category: Optional[str] = Form(None)
):
    """
    Accepts an uploaded image of a waste item.
    Performs YOLO inference / visual feature analysis.
    Returns: category, confidence, bounding boxes, annotated image, and verification assessment.
    """
    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = classifier.classify_image(image_bytes, target_bin_category)

        # Evaluate against verification rules
        eval_result = evaluate_deposit(
            reported_category=target_bin_category or result["predicted_category"],
            ai_predicted_category=result["predicted_category"],
            ai_confidence=result["confidence"],
            bin_category=target_bin_category
        )

        return {
            "success": True,
            "filename": file.filename,
            "prediction": result["predicted_category"],
            "confidence": result["confidence"],
            "raw_label": result["raw_label"],
            "bounding_boxes": result["detections"],
            "primary_box": result["primary_box"],
            "annotated_image": result["annotated_image"],
            "engine": result["engine"],
            "verification": eval_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

# -----------------------------------------------------------------------------
# 2. Digital Twin Campus Bins & Telemetry Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/bins")
def get_campus_bins(
    category: Optional[str] = None,
    status: Optional[str] = None,
    zone: Optional[str] = None
):
    """Returns smart bins filtered by category, status, or campus zone."""
    results = CAMPUS_BINS_DB
    if category and category != "all":
        results = [b for b in results if b["category"].lower() == category.lower()]
    if status and status != "all":
        results = [b for b in results if b["status"].upper() == status.upper()]
    if zone and zone != "all":
        results = [b for b in results if b["campus_zone"].lower() == zone.lower()]
    return results

@app.get("/api/bins/{bin_id}")
def get_bin_by_id(bin_id: str):
    bin_item = next((b for b in CAMPUS_BINS_DB if b["id"] == bin_id or b["bin_code"] == bin_id), None)
    if not bin_item:
        raise HTTPException(status_code=404, detail="Bin not found")
    return bin_item

@app.patch("/api/bins/{bin_id}/telemetry")
def update_bin_telemetry(bin_id: str, payload: TelemetryUpdateRequest):
    """Simulates an IoT sensor telemetry event (e.g. fill level, empty bin flush)."""
    bin_item = next((b for b in CAMPUS_BINS_DB if b["id"] == bin_id or b["bin_code"] == bin_id), None)
    if not bin_item:
        raise HTTPException(status_code=404, detail="Bin not found")

    if payload.fill_level_pct is not None:
        bin_item["fill_level_pct"] = max(0, min(100, payload.fill_level_pct))
        if bin_item["fill_level_pct"] >= 90:
            bin_item["status"] = "FULL"
        elif bin_item["fill_level_pct"] >= 75:
            bin_item["status"] = "NEAR_FULL"
        else:
            bin_item["status"] = "NORMAL"

    if payload.status:
        bin_item["status"] = payload.status

    if payload.battery_level_pct is not None:
        bin_item["battery_level_pct"] = payload.battery_level_pct

    bin_item["last_collected_at"] = datetime.datetime.now().isoformat()
    return {"success": True, "bin": bin_item}

# -----------------------------------------------------------------------------
# 3. Verification & Review Queue Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/deposits/review-queue")
def get_review_queue():
    """Returns deposits flagged for human staff review."""
    return DEPOSITS_REVIEW_QUEUE

@app.post("/api/deposits/{deposit_id}/verify")
def verify_deposit_manual(deposit_id: str, req: ManualVerifyRequest):
    """Admin/Staff manual decision endpoint awarding EcoCoins upon approval."""
    deposit = next((d for d in DEPOSITS_REVIEW_QUEUE if d["id"] == deposit_id), None)
    if not deposit:
        # Create a mock stub if test ID
        deposit = {
            "id": deposit_id,
            "student_id": "std-test-user",
            "reported_category": "plastic",
            "ai_predicted_category": "plastic",
            "status": "NEEDS_STAFF_REVIEW"
        }

    if req.decision.upper() == "APPROVE":
        approval = calculate_manual_approval(deposit, req.approved_category)
        deposit.update(approval)
        deposit["status"] = "APPROVED"
        deposit["verified_by"] = req.staff_id
        deposit["verified_at"] = datetime.datetime.now().isoformat()
        if req.notes:
            deposit["verification_notes"] = req.notes
        return {"success": True, "deposit": deposit, "coins_awarded": approval["coins_awarded"]}
    else:
        deposit["status"] = "REJECTED"
        deposit["coins_awarded"] = 0
        deposit["verification_notes"] = req.notes or "Rejected by staff due to contamination or non-recyclable item."
        deposit["verified_by"] = req.staff_id
        deposit["verified_at"] = datetime.datetime.now().isoformat()
        return {"success": True, "deposit": deposit, "coins_awarded": 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
