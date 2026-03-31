#!/usr/bin/env python3
"""
test_svm.py - Test script for SVM engine
Run this to verify the SVM engine is working correctly
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from svm_engine import get_model, extract_features, CLASS_LABELS
import numpy as np

def test_svm_engine():
    print("🧪 Testing SVM Engine...")
    print("=" * 50)
    
    try:
        # Test model loading/training
        print("1. Loading/Training SVM model...")
        model = get_model()
        print("   ✓ Model loaded successfully")
        
        # Test feature extraction
        print("\n2. Testing feature extraction...")
        features = extract_features(wpm=100, accuracy=0.75, streak=3, session_history=[0.6, 0.7, 0.75])
        print(f"   ✓ Features extracted: {features}")
        
        # Test predictions
        print("\n3. Testing predictions...")
        test_cases = [
            {"wpm": 40,  "accuracy": 0.45, "streak": 0, "history": [0.4, 0.45], "expected": "Beginner"},
            {"wpm": 70,  "accuracy": 0.65, "streak": 1, "history": [0.55, 0.62, 0.65], "expected": "Easy"},
            {"wpm": 100, "accuracy": 0.75, "streak": 3, "history": [0.68, 0.72, 0.74, 0.75], "expected": "Medium"},
            {"wpm": 130, "accuracy": 0.85, "streak": 5, "history": [0.80, 0.83, 0.85], "expected": "Hard"},
            {"wpm": 160, "accuracy": 0.93, "streak": 8, "history": [0.88, 0.90, 0.92, 0.93], "expected": "Expert"},
        ]
        
        for i, test in enumerate(test_cases):
            X = extract_features(test["wpm"], test["accuracy"], test["streak"], test["history"])
            prediction = int(model.predict(X)[0])
            predicted_label = CLASS_LABELS[prediction]
            confidence = model.predict_proba(X)[0][prediction] * 100
            
            print(f"   Test {i+1}: WPM={test['wpm']:3d}, Acc={test['accuracy']:.2f}, Streak={test['streak']}")
            print(f"           → Predicted: {predicted_label:10s} (confidence: {confidence:.1f}%)")
            print(f"           → Expected:  {test['expected']:10s}")
            print()
        
        print("🎉 SVM Engine test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ SVM Engine test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_svm_engine()
    sys.exit(0 if success else 1)