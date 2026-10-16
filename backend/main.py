"""
EcoCoin FastAPI Backend Service
Provides Computer Vision inference, IoT Digital Twin telemetry, and deposit verification.
"""

from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import json
import re
import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure .env in current directory is loaded
_local_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_local_env):
    load_dotenv(dotenv_path=_local_env)

try:
    import google.generativeai as genai
    _HAS_GENAI = True
except ImportError:
    _HAS_GENAI = False

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

# In-memory mock store for demo/standalone operation with Dayananda Sagar University Harohalli coordinates (~12.6514°N, 77.2833°E)
CAMPUS_BINS_DB = [
    {
        "id": "b1111111-1111-1111-1111-111111111111",
        "bin_code": "BIN-CAMPUS-001",
        "name": "Turing Plaza Plastic Hub",
        "category": "plastic",
        "campus_zone": "North Quad",
        "building": "Turing Hall",
        "floor": "Ground Level",
        "latitude": 12.6518,
        "longitude": 77.2830,
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
        "latitude": 12.6525,
        "longitude": 77.2828,
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
        "latitude": 12.6508,
        "longitude": 77.2835,
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
        "latitude": 12.6512,
        "longitude": 77.2842,
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
        "latitude": 12.6522,
        "longitude": 77.2840,
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
        "latitude": 12.6498,
        "longitude": 77.2825,
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
        "latitude": 12.6502,
        "longitude": 77.2850,
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
        "latitude": 12.6530,
        "longitude": 77.2820,
        "fill_level_pct": 15,
        "capacity_liters": 200,
        "battery_level_pct": 65,
        "status": "MAINTENANCE",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(days=3)).isoformat(),
    },
    {
        "id": "b9999999-9999-9999-9999-999999999999",
        "bin_code": "BIN-CAMPUS-009",
        "name": "Chemistry Lab Hazardous Disposal",
        "category": "chemical",
        "campus_zone": "Science Block",
        "building": "Science Block",
        "floor": "Basement Lab",
        "latitude": 12.6520,
        "longitude": 77.2845,
        "fill_level_pct": 28,
        "capacity_liters": 100,
        "battery_level_pct": 92,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=8)).isoformat(),
    },
    {
        "id": "baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "bin_code": "BIN-CAMPUS-010",
        "name": "E-Waste Collection Hub",
        "category": "e-waste",
        "campus_zone": "IT Building",
        "building": "IT Building",
        "floor": "Ground Floor",
        "latitude": 12.6515,
        "longitude": 77.2822,
        "fill_level_pct": 42,
        "capacity_liters": 200,
        "battery_level_pct": 96,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=14)).isoformat(),
    },
    {
        "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "bin_code": "BIN-CAMPUS-011",
        "name": "Biomedical Waste Station",
        "category": "biomedical",
        "campus_zone": "Health Center",
        "building": "Health Center",
        "floor": "First Aid Wing",
        "latitude": 12.6505,
        "longitude": 77.2838,
        "fill_level_pct": 33,
        "capacity_liters": 80,
        "battery_level_pct": 89,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=5)).isoformat(),
    },
    {
        "id": "bcccccccc-cccc-cccc-cccc-cccccccccccc",
        "bin_code": "BIN-CAMPUS-012",
        "name": "Construction Debris Drop",
        "category": "construction",
        "campus_zone": "Engineering Block",
        "building": "Engineering Block",
        "floor": "Workshop Yard",
        "latitude": 12.6535,
        "longitude": 77.2837,
        "fill_level_pct": 65,
        "capacity_liters": 500,
        "battery_level_pct": 87,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=10)).isoformat(),
    },
    {
        "id": "bddddddd-dddd-dddd-dddd-dddddddddddd",
        "bin_code": "BIN-CAMPUS-013",
        "name": "Cardboard Recycling Bay",
        "category": "cardboard",
        "campus_zone": "Admin Block",
        "building": "Admin Block",
        "floor": "Service Bay",
        "latitude": 12.6510,
        "longitude": 77.2818,
        "fill_level_pct": 52,
        "capacity_liters": 300,
        "battery_level_pct": 91,
        "status": "NORMAL",
        "last_collected_at": (datetime.datetime.now() - datetime.timedelta(hours=7)).isoformat(),
    },
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
    has_key = bool(os.getenv("GEMINI_API_KEY"))
    vision_engine = "Gemini Vision" if has_key else ("Ultralytics YOLO" if classifier.yolo_model else "Hybrid Vision Engine")
    return {
        "service": "EcoCoin AI & Digital Twin Service",
        "status": "healthy",
        "vision_engine": vision_engine,
        "gemini_configured": has_key,
        "reward_policy": REWARD_POLICY,
        "smart_bins_count": len(CAMPUS_BINS_DB),
        "review_queue_count": len(DEPOSITS_REVIEW_QUEUE)
    }

# -----------------------------------------------------------------------------
# Configuration & Status Endpoint
# -----------------------------------------------------------------------------
@app.get("/api/config/status")
def get_config_status():
    """Returns whether Gemini API key is configured."""
    has_key = bool(os.getenv('GEMINI_API_KEY'))
    engine = "Gemini Vision (gemini-2.0-flash)" if has_key else ("Ultralytics YOLO" if classifier.yolo_model else "Hybrid Vision Engine")
    return {
        "gemini_configured": has_key,
        "vision_engine": engine
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
    Performs Gemini Vision inference with YOLO and heuristic fallback.
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
            "verification": eval_result,
            "reasoning": result.get("reasoning")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

# -----------------------------------------------------------------------------
# 2. GenAI Personalized Recommendations Endpoint
# -----------------------------------------------------------------------------
@app.post("/api/ai/recommendations")
async def get_ai_recommendations(user_history: Optional[Dict[str, Any]] = Body(None)):
    """Uses Gemini to generate personalized waste management recommendations."""
    history = user_history or {}
    api_key = os.getenv("GEMINI_API_KEY")

    default_response = {
        "summary": "Great work contributing to Dayananda Sagar University sustainability! Segregating special streams boosts rewards significantly.",
        "recommendations": [
            {
                "category": "cardboard",
                "title": "Flatten Delivery Boxes",
                "tip": "Flatten delivery and parcel boxes before dropping them at Cardboard Recycling Bay (Admin Block).",
                "coins_boost": "+7 EcoCoins per box",
                "impact": "Saves 0.12kg CO2 and preserves paper fiber quality"
            },
            {
                "category": "e-waste",
                "title": "Recycle Dead Gadgets & Cables",
                "tip": "Deposit old charging cables and batteries into IT Building E-Waste Hub rather than general bins.",
                "coins_boost": "+25 EcoCoins per item",
                "impact": "Prevents heavy metal pollution and saves 0.60kg CO2"
            },
            {
                "category": "chemical",
                "title": "Lab Solvents & Hazardous Containers",
                "tip": "Use designated containers in Chemistry Lab Science Block for lab reagents.",
                "coins_boost": "+20 EcoCoins",
                "impact": "Maintains chemical safety and saves 0.50kg CO2"
            },
            {
                "category": "plastic",
                "title": "Empty & Rinse Beverage Bottles",
                "tip": "Rinse containers before depositing at Turing Plaza Plastic Hub to keep the stream clean.",
                "coins_boost": "+10 EcoCoins",
                "impact": "Eliminates batch contamination and saves 0.25kg CO2"
            }
        ],
        "suggested_bins": ["BIN-CAMPUS-010", "BIN-CAMPUS-013", "BIN-CAMPUS-001", "BIN-CAMPUS-009"],
        "campus_tip": "Dayananda Sagar University Harohalli has 13 smart digital-twin bins covering all waste categories across 6 campus zones.",
        "source": "rule-engine"
    }

    if not _HAS_GENAI or not api_key:
        return default_response

    try:
        genai.configure(api_key=api_key)
        prompt = (
            "You are an AI Sustainability and Waste Management Advisor for campus students at Dayananda Sagar University.\n"
            f"Here is the student's recycling history and activity profile:\n{json.dumps(history, indent=2)}\n\n"
            "Generate actionable, personalized recycling tips and waste management recommendations tailored for a college campus.\n"
            "Return ONLY a valid JSON object matching this schema without markdown or other text:\n"
            "{\n"
            '  "summary": "A concise motivational assessment of the student\'s recycling habit",\n'
            '  "recommendations": [\n'
            '    {\n'
            '      "category": "plastic|paper|metal|glass|organic|chemical|e-waste|biomedical|construction|cardboard",\n'
            '      "title": "Actionable recommendation title",\n'
            '      "tip": "Clear, practical sorting or deposit advice",\n'
            '      "coins_boost": "e.g. +15 EcoCoins",\n'
            '      "impact": "e.g. Saves 0.40kg CO2"\n'
            '    }\n'
            '  ],\n'
            '  "suggested_bins": ["BIN-CAMPUS-001", "BIN-CAMPUS-010"],\n'
            '  "campus_tip": "Advice specific to Dayananda Sagar University Harohalli facilities"\n'
            "}"
        )

        models_to_try = ["gemini-2.0-flash", "gemini-3.8-flash", "gemini-flash-latest"]
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                res = model.generate_content(prompt)
                if not res or not res.text:
                    continue
                
                text = res.text.strip()
                if text.startswith("```"):
                    lines = text.splitlines()
                    if lines and lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    text = "\n".join(lines).strip()

                parsed = None
                try:
                    parsed = json.loads(text)
                except Exception:
                    match = re.search(r"\{.*\}", text, re.DOTALL)
                    if match:
                        parsed = json.loads(match.group(0))

                if parsed and "recommendations" in parsed:
                    parsed["source"] = f"gemini ({model_name})"
                    return parsed
            except Exception:
                continue

    except Exception:
        pass

    return default_response

# -----------------------------------------------------------------------------
# 3. Digital Twin Campus Bins & Telemetry Endpoints
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
# 4. Verification & Review Queue Endpoints
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
