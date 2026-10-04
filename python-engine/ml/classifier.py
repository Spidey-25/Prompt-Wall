import json
import os
import threading
from datetime import datetime, timezone
from typing import Any, Dict

import joblib
from sklearn.feature_extraction.text import HashingVectorizer
from sklearn.linear_model import SGDClassifier


class OnlineSecurityClassifier:
    """Small local classifier that learns only from explicitly labelled inputs."""

    LABELS = ("SAFE", "THREAT")

    def __init__(self) -> None:
        root = os.path.dirname(os.path.dirname(__file__))
        data_dir = os.path.join(root, "data", "ml")
        os.makedirs(data_dir, exist_ok=True)
        self.model_path = os.path.join(data_dir, "security_classifier.joblib")
        self.records_path = os.path.join(data_dir, "training_records.jsonl")
        self.vectorizer = HashingVectorizer(
            n_features=2**12, alternate_sign=False, norm="l2"
        )
        self.model = self._load_model()
        self.lock = threading.Lock()

    def _load_model(self) -> SGDClassifier:
        if os.path.exists(self.model_path):
            loaded = joblib.load(self.model_path)
            if isinstance(loaded, SGDClassifier):
                return loaded
        return SGDClassifier(loss="log_loss", random_state=42)

    def _is_trained(self) -> bool:
        return hasattr(self.model, "classes_")

    def _record(self, text: str, label: str) -> None:
        with open(self.records_path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps({
                "text": text,
                "label": label,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }) + "\n")

    def predict(self, text: str) -> Dict[str, Any]:
        clean_text = text.strip()
        if not self._is_trained():
            return {
                "status": "UNTRAINED",
                "prediction": None,
                "confidence": None,
                "training_samples": 0,
                "message": "Label at least one input before requesting a prediction.",
            }
        probabilities = self.model.predict_proba(
            self.vectorizer.transform([clean_text])
        )[0]
        index = int(probabilities.argmax())
        return {
            "status": "READY",
            "prediction": str(self.model.classes_[index]),
            "confidence": round(float(probabilities[index]), 4),
            "training_samples": int(self.model.t_),
            "message": "Prediction generated from the locally trained classifier.",
        }

    def learn(self, text: str, label: str) -> Dict[str, Any]:
        clean_text = text.strip()
        normalized_label = label.strip().upper()
        if normalized_label not in self.LABELS:
            raise ValueError("label must be SAFE or THREAT")
        with self.lock:
            features = self.vectorizer.transform([clean_text])
            if self._is_trained():
                self.model.partial_fit(features, [normalized_label])
            else:
                self.model.partial_fit(features, [normalized_label], classes=self.LABELS)
            joblib.dump(self.model, self.model_path)
            self._record(clean_text, normalized_label)
            result = self.predict(clean_text)
            result["label_recorded"] = normalized_label
            result["training_samples"] = int(self.model.t_)
            return result


classifier = OnlineSecurityClassifier()
