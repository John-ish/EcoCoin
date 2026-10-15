"""
Unit and integration test for EcoCoin Computer Vision & Verification Module
"""

import io
from PIL import Image, ImageDraw
from vision import classifier
from verification import evaluate_deposit, calculate_manual_approval, REWARD_POLICY

def generate_synthetic_test_image(category: str = "plastic") -> bytes:
    """Generates an in-memory sample image for automated testing."""
    img = Image.new("RGB", (320, 240), color=(240, 245, 250))
    draw = ImageDraw.Draw(img)

    if category == "plastic":
        # Draw blue bottle shape
        draw.rectangle([130, 40, 190, 80], fill=(50, 150, 240))
        draw.rectangle([110, 80, 210, 200], fill=(70, 170, 250))
        draw.text((125, 130), "WATER", fill=(255, 255, 255))
    elif category == "organic":
        # Draw green apple/leaf shape
        draw.ellipse([100, 60, 220, 180], fill=(80, 200, 50))
        draw.rectangle([155, 30, 165, 60], fill=(100, 50, 20))
    elif category == "metal":
        # Draw silver/gray can
        draw.rectangle([120, 50, 200, 190], fill=(210, 210, 215))
        draw.ellipse([120, 40, 200, 60], fill=(180, 180, 185))
    else:
        draw.rectangle([80, 50, 240, 190], fill=(200, 180, 140))
        draw.text((120, 110), "CARDBOARD", fill=(40, 30, 20))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def run_tests():
    print("==================================================")
    print(" Running EcoCoin Vision & Verification Test Suite ")
    print("==================================================")

    # Test 1: Plastic Bottle Classification
    plastic_bytes = generate_synthetic_test_image("plastic")
    result_plastic = classifier.classify_image(plastic_bytes, target_bin_category="plastic")
    print(f"[TEST 1] Plastic Classification: {result_plastic['predicted_category']} (Conf: {result_plastic['confidence']})")
    assert result_plastic["predicted_category"] is not None
    assert "annotated_image" in result_plastic
    assert result_plastic["annotated_image"].startswith("data:image/jpeg;base64,")
    print("  -> Passed. Bounding box & annotation rendered successfully.")

    # Test 2: High Confidence Matching Stream Auto-Verification
    eval_match = evaluate_deposit(
        reported_category="plastic",
        ai_predicted_category="plastic",
        ai_confidence=0.88,
        bin_category="plastic"
    )
    print(f"[TEST 2] Auto-Approval Match: Status = {eval_match['status']}, Coins = {eval_match['coins_awarded']}")
    assert eval_match["status"] == "APPROVED"
    assert eval_match["coins_awarded"] == REWARD_POLICY["plastic"]["coins"]
    print("  -> Passed. Auto-approved and correct coins allocated.")

    # Test 3: Low Confidence Triggers Staff Review
    eval_low_conf = evaluate_deposit(
        reported_category="plastic",
        ai_predicted_category="plastic",
        ai_confidence=0.62,
        bin_category="plastic"
    )
    print(f"[TEST 3] Low Confidence Quarantine: Status = {eval_low_conf['status']}, Coins = {eval_low_conf['coins_awarded']}")
    assert eval_low_conf["status"] == "NEEDS_STAFF_REVIEW"
    assert eval_low_conf["coins_awarded"] == 0  # Crucial security guarantee!
    print("  -> Passed. Zero coins awarded for unverified deposit.")

    # Test 4: Stream Mismatch Triggers Staff Review
    eval_mismatch = evaluate_deposit(
        reported_category="paper",
        ai_predicted_category="metal",
        ai_confidence=0.92,
        bin_category="paper"
    )
    print(f"[TEST 4] Stream Mismatch Quarantine: Status = {eval_mismatch['status']}, Coins = {eval_mismatch['coins_awarded']}")
    assert eval_mismatch["status"] == "NEEDS_STAFF_REVIEW"
    assert eval_mismatch["coins_awarded"] == 0
    print("  -> Passed. Contamination protection active.")

    # Test 5: Admin Manual Approval
    mock_deposit = {
        "id": "dep-999",
        "ai_predicted_category": "metal",
        "reported_category": "paper"
    }
    manual_res = calculate_manual_approval(mock_deposit, approved_category="metal")
    print(f"[TEST 5] Staff Manual Approval: Status = {manual_res['status']}, Coins = {manual_res['coins_awarded']}")
    assert manual_res["status"] == "APPROVED"
    assert manual_res["coins_awarded"] == REWARD_POLICY["metal"]["coins"]
    print("  -> Passed. Staff override awards correct ledger credit.")

    print("\nALL 5 VISION & VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
