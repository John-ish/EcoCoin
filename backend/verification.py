"""
EcoCoin Verification and Reward Rules Engine
Handles backend verification, coin calculation, and ledger payload generation.
"""

from typing import Dict, Any, Optional

# Waste reward policy (Coins per item category)
REWARD_POLICY = {
    "plastic": {"coins": 10, "weight_kg": 0.15, "co2_saved_kg": 0.25},
    "metal": {"coins": 15, "weight_kg": 0.20, "co2_saved_kg": 0.45},
    "paper": {"coins": 8, "weight_kg": 0.12, "co2_saved_kg": 0.18},
    "glass": {"coins": 12, "weight_kg": 0.35, "co2_saved_kg": 0.30},
    "organic": {"coins": 6, "weight_kg": 0.25, "co2_saved_kg": 0.15},
    "general": {"coins": 2, "weight_kg": 0.10, "co2_saved_kg": 0.05},
    "multi-stream": {"coins": 10, "weight_kg": 0.18, "co2_saved_kg": 0.22},
    "chemical": {"coins": 20, "weight_kg": 0.30, "co2_saved_kg": 0.50},
    "e-waste": {"coins": 25, "weight_kg": 0.40, "co2_saved_kg": 0.60},
    "biomedical": {"coins": 18, "weight_kg": 0.15, "co2_saved_kg": 0.35},
    "construction": {"coins": 5, "weight_kg": 0.50, "co2_saved_kg": 0.10},
    "cardboard": {"coins": 7, "weight_kg": 0.20, "co2_saved_kg": 0.12},
}

CONFIDENCE_AUTO_APPROVE_THRESHOLD = 0.80

def evaluate_deposit(
    reported_category: str,
    ai_predicted_category: str,
    ai_confidence: float,
    bin_category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates deposit verification status and calculates potential coin award.
    Never auto-awards coins if confidence is below threshold or category is mismatched.
    """
    reported = reported_category.lower()
    predicted = ai_predicted_category.lower()
    bin_cat = (bin_category or reported).lower()

    # Base reward spec
    reward_spec = REWARD_POLICY.get(predicted, REWARD_POLICY["general"])
    coins = reward_spec["coins"]
    weight = reward_spec["weight_kg"]

    # Evaluation logic
    if ai_confidence < CONFIDENCE_AUTO_APPROVE_THRESHOLD:
        status = "NEEDS_STAFF_REVIEW"
        notes = f"AI confidence ({int(ai_confidence * 100)}%) is below auto-approve threshold ({int(CONFIDENCE_AUTO_APPROVE_THRESHOLD * 100)}%). Awaiting staff verification."
        coins_to_award = 0  # Not awarded yet
    elif bin_cat != "multi-stream" and predicted != bin_cat:
        status = "NEEDS_STAFF_REVIEW"
        notes = f"Stream Mismatch: Deposited into '{bin_cat}' bin, but AI detected '{predicted}'. Awaiting staff verification."
        coins_to_award = 0
    else:
        status = "APPROVED"
        notes = f"Auto-verified by EcoCoin Vision AI with {int(ai_confidence * 100)}% confidence."
        coins_to_award = coins

    return {
        "status": status,
        "coins_awarded": coins_to_award,
        "potential_coins": coins,
        "estimated_weight_kg": weight,
        "verification_notes": notes,
        "requires_staff_review": status == "NEEDS_STAFF_REVIEW"
    }

def calculate_manual_approval(deposit: Dict[str, Any], approved_category: Optional[str] = None) -> Dict[str, Any]:
    """Calculates coins and stats for an admin manual approval."""
    cat = (approved_category or deposit.get("ai_predicted_category") or deposit.get("reported_category") or "general").lower()
    reward_spec = REWARD_POLICY.get(cat, REWARD_POLICY["general"])
    
    return {
        "status": "APPROVED",
        "coins_awarded": reward_spec["coins"],
        "estimated_weight_kg": reward_spec["weight_kg"],
        "co2_saved_kg": reward_spec["co2_saved_kg"],
        "verification_notes": f"Manually verified and approved by campus sustainability staff."
    }
