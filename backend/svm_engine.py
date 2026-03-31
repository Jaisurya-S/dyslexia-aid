"""
svm_engine.py  —  SVM Adaptive Engine for Speech/Listening Tests
================================================================
Add this to your Flask app (app.py) or import it as a blueprint.

Features fed into SVM:
  - wpm            : words per minute (speech speed)
  - accuracy       : word accuracy score [0.0 – 1.0]
  - streak         : consecutive correct answers
  - session_history: list of recent accuracy scores (last 5 used)

SVM outputs:
  - class_index        : 0=Beginner, 1=Easy, 2=Medium, 3=Hard, 4=Expert
  - difficulty_score   : float [0.8 – 3.5] mapped to existing difficulty range
  - confidence         : int [0 – 100] (softmax-like from decision function)
  - phoneme_score      : int [0 – 100] (derived from accuracy + history std)
  - class_probabilities: list of 5 floats (%) summing to 100

Install:  pip install scikit-learn numpy flask flask-cors joblib
"""

import numpy as np
from flask import Blueprint, request, jsonify
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib
import os

# ─── Blueprint ────────────────────────────────────────────────────────────────
svm_bp = Blueprint('svm', __name__)

# ─── Model path ───────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'svm_model.pkl')

# ─── Difficulty mapping ───────────────────────────────────────────────────────
CLASS_TO_DIFFICULTY = {0: 0.8, 1: 1.5, 2: 2.0, 3: 2.5, 4: 3.2}
CLASS_LABELS        = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert']


# ─────────────────────────────────────────────────────────────────────────────
#  SYNTHETIC TRAINING DATA
#  [wpm_norm, accuracy, streak_norm, hist_avg]  →  class (0–4)
#  wpm_norm  = wpm / 180  (max expected wpm)
#  streak_norm = streak / 10
# ─────────────────────────────────────────────────────────────────────────────
def _generate_training_data():
    np.random.seed(42)
    X, y = [], []

    # Class 0 – Beginner
    for _ in range(120):
        X.append([
            np.random.uniform(0.05, 0.25),   # slow
            np.random.uniform(0.20, 0.55),   # low accuracy
            np.random.uniform(0.00, 0.20),   # low streak
            np.random.uniform(0.20, 0.50),   # low history
        ])
        y.append(0)

    # Class 1 – Easy
    for _ in range(120):
        X.append([
            np.random.uniform(0.20, 0.40),
            np.random.uniform(0.50, 0.68),
            np.random.uniform(0.10, 0.35),
            np.random.uniform(0.45, 0.62),
        ])
        y.append(1)

    # Class 2 – Medium
    for _ in range(120):
        X.append([
            np.random.uniform(0.35, 0.58),
            np.random.uniform(0.65, 0.78),
            np.random.uniform(0.30, 0.55),
            np.random.uniform(0.60, 0.74),
        ])
        y.append(2)

    # Class 3 – Hard
    for _ in range(120):
        X.append([
            np.random.uniform(0.55, 0.75),
            np.random.uniform(0.75, 0.88),
            np.random.uniform(0.50, 0.75),
            np.random.uniform(0.72, 0.85),
        ])
        y.append(3)

    # Class 4 – Expert
    for _ in range(120):
        X.append([
            np.random.uniform(0.70, 1.00),
            np.random.uniform(0.85, 1.00),
            np.random.uniform(0.70, 1.00),
            np.random.uniform(0.83, 1.00),
        ])
        y.append(4)

    return np.array(X), np.array(y)


# ─────────────────────────────────────────────────────────────────────────────
#  MODEL: Train or load
# ─────────────────────────────────────────────────────────────────────────────
def get_model() -> Pipeline:
    """Return trained SVM pipeline (load from disk or train fresh)."""
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return _train_and_save()


def _train_and_save() -> Pipeline:
    X, y = _generate_training_data()

    # RBF-kernel SVC with probability estimates (Platt scaling)
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('svm', SVC(
            kernel='rbf',
            C=10.0,          # regularisation — tighter margin
            gamma='scale',   # 1 / (n_features * X.var())
            probability=True,# enables predict_proba via Platt scaling
            class_weight='balanced',
            random_state=42,
        )),
    ])
    pipeline.fit(X, y)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"[SVM] Model trained & saved → {MODEL_PATH}")
    return pipeline


# Load once at import time
_model: Pipeline = None

def _get_or_load():
    global _model
    if _model is None:
        _model = get_model()
    return _model


# ─────────────────────────────────────────────────────────────────────────────
#  FEATURE EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────
def extract_features(wpm: float, accuracy: float, streak: int, session_history: list) -> np.ndarray:
    """
    Normalise raw inputs into the 4-dimensional feature vector expected by the SVM.

    Parameters
    ----------
    wpm              : words per minute (0 if listening test)
    accuracy         : float [0.0, 1.0]
    streak           : consecutive correct answers
    session_history  : list of accuracy floats (most recent last)

    Returns
    -------
    np.ndarray of shape (1, 4)
    """
    MAX_WPM    = 180.0
    MAX_STREAK = 10.0

    wpm_norm    = min(float(wpm) / MAX_WPM, 1.0)
    acc_norm    = min(float(accuracy), 1.0)
    streak_norm = min(float(streak) / MAX_STREAK, 1.0)

    recent = session_history[-5:] if session_history else []
    hist_avg = float(np.mean(recent)) if recent else 0.5

    return np.array([[wpm_norm, acc_norm, streak_norm, hist_avg]])


def phoneme_score(accuracy: float, session_history: list) -> int:
    """
    Approximate phoneme quality [0–100].
    High accuracy + low variance in history → high phoneme quality.
    """
    recent = session_history[-5:] if session_history else [accuracy]
    std    = float(np.std(recent)) if len(recent) > 1 else 0.0
    score  = accuracy * 88 + (1.0 - std) * 12
    return int(min(100, max(0, round(score * 100 if score <= 1 else score))))


# ─────────────────────────────────────────────────────────────────────────────
#  FLASK ROUTE  →  POST /api/svm-predict
# ─────────────────────────────────────────────────────────────────────────────
@svm_bp.route('/api/svm-predict', methods=['POST'])
def svm_predict():
    """
    Request JSON:
    {
      "user_id": "u123",
      "features": {
        "wpm": 95.4,
        "accuracy": 0.82,
        "streak": 3,
        "session_history": [0.65, 0.72, 0.80, 0.82]
      }
    }

    Response JSON:
    {
      "class_index": 2,
      "class_label": "Medium",
      "difficulty_score": 2.0,
      "confidence": 87,
      "phoneme_score": 79,
      "class_probabilities": [1.2, 4.5, 72.3, 18.0, 4.0]
    }
    """
    data = request.get_json(force=True)
    f    = data.get('features', {})

    wpm            = float(f.get('wpm') or 0)
    accuracy       = float(f.get('accuracy', 0.5))
    streak         = int(f.get('streak', 0))
    session_history = [float(x) for x in f.get('session_history', [])]

    # Feature vector
    X = extract_features(wpm, accuracy, streak, session_history)

    # Prediction
    model      = _get_or_load()
    class_idx  = int(model.predict(X)[0])
    proba      = model.predict_proba(X)[0]          # shape (5,)
    confidence = int(round(float(proba[class_idx]) * 100))

    # Decision function → softmax for richer probabilities
    dec        = model.decision_function(X)[0]       # shape (5,)
    exp_dec    = np.exp(dec - np.max(dec))
    softmax    = (exp_dec / exp_dec.sum() * 100).round(1).tolist()

    ph_score   = phoneme_score(accuracy, session_history)
    diff_score = CLASS_TO_DIFFICULTY[class_idx]

    return jsonify({
        'class_index'        : class_idx,
        'class_label'        : CLASS_LABELS[class_idx],
        'difficulty_score'   : diff_score,
        'confidence'         : confidence,
        'phoneme_score'      : ph_score,
        'class_probabilities': softmax,
    })


# ─────────────────────────────────────────────────────────────────────────────
#  REGISTRATION HELPER  (call from your app.py)
# ─────────────────────────────────────────────────────────────────────────────
def register_svm(app):
    """
    In app.py:

        from svm_engine import register_svm
        register_svm(app)
    """
    _get_or_load()          # warm-up: train/load model at startup
    app.register_blueprint(svm_bp)
    print("[SVM] Blueprint registered — /api/svm-predict is live")


# ─────────────────────────────────────────────────────────────────────────────
#  STANDALONE TEST
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    model = get_model()
    tests = [
        dict(wpm=40,  accuracy=0.45, streak=0, session_history=[0.4, 0.45]),
        dict(wpm=70,  accuracy=0.65, streak=1, session_history=[0.55, 0.62, 0.65]),
        dict(wpm=100, accuracy=0.75, streak=3, session_history=[0.68, 0.72, 0.74, 0.75]),
        dict(wpm=130, accuracy=0.85, streak=5, session_history=[0.80, 0.83, 0.85]),
        dict(wpm=160, accuracy=0.93, streak=8, session_history=[0.88, 0.90, 0.92, 0.93]),
    ]
    print("\n── SVM Predictions ──────────────────────────────")
    for t in tests:
        X   = extract_features(t['wpm'], t['accuracy'], t['streak'], t['session_history'])
        cls = int(model.predict(X)[0])
        prob = model.predict_proba(X)[0]
        print(f"WPM={t['wpm']:3d}  acc={t['accuracy']:.2f}  streak={t['streak']}  "
              f"→  {CLASS_LABELS[cls]:10s}  (conf={prob[cls]*100:.1f}%)")