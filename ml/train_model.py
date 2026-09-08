"""
train_model.py — run this ONCE, offline, after generateSyntheticData.mjs has
produced ml/training_data.csv. Never runs in the browser.

Feature set (15 total): the 13 factor scores bankFactors.js already computes
(cibil, gst, itr, balanceSheet, businessAge, bankAccounts, googleRating,
onlineReviews, socialMedia, ownership, provisionalBalanceSheet, location,
competition — the 3 conditional ones mean-imputed to 50 when absent) plus
2 presence-indicator flags (has_google_listing, has_social_media) so the
model can learn to discount an imputed value rather than trust it blindly.
"""

import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

df = pd.read_csv("ml/training_data.csv")

FEATURE_COLUMNS = [
    "cibil", "gst", "revenueReconciliation", "itr", "balanceSheet", "businessAge", "bankAccounts",
    "googleRating", "onlineReviews", "socialMedia", "ownership",
    "provisionalBalanceSheet", "location", "competition",
    "has_google_listing", "has_social_media",
]

X = df[FEATURE_COLUMNS].values
y = df["defaulted"].values

print(f"Dataset: {len(df)} businesses, {y.mean()*100:.1f}% historical default rate")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

model = LogisticRegression(max_iter=1000)
model.fit(X_train_scaled, y_train)

train_acc = model.score(X_train_scaled, y_train)
test_acc = model.score(X_test_scaled, y_test)
print(f"Training accuracy: {train_acc*100:.1f}%")
print(f"Held-out test accuracy: {test_acc*100:.1f}%")

print("\nLearned coefficients:")
for name, coef in zip(FEATURE_COLUMNS, model.coef_[0]):
    print(f"  {name}: {coef:.4f}")
print(f"  intercept: {model.intercept_[0]:.4f}")

export = {
    "featureNames": FEATURE_COLUMNS,
    "scalerMean": scaler.mean_.tolist(),
    "scalerScale": scaler.scale_.tolist(),
    "coefficients": model.coef_[0].tolist(),
    "intercept": float(model.intercept_[0]),
    "trainAccuracy": train_acc,
    "testAccuracy": test_acc,
    "trainedOn": "synthetic_v1_multiyear",
}
with open("ml/model_weights.json", "w") as f:
    json.dump(export, f, indent=2)
print("\nWrote ml/model_weights.json")

# ---- Fixed test cases for verifying the JS port matches exactly ----
test_rows = df.sample(n=6, random_state=7)[FEATURE_COLUMNS + ["defaulted"]]
test_predictions = []
for _, row in test_rows.iterrows():
    feats = np.array([row[FEATURE_COLUMNS].values.astype(float)])
    feats_scaled = scaler.transform(feats)
    prob_default = model.predict_proba(feats_scaled)[0][1]
    score = round((1 - prob_default) * 100)
    entry = {col: float(row[col]) for col in FEATURE_COLUMNS}
    entry["prob_default"] = float(prob_default)
    entry["score"] = score
    test_predictions.append(entry)
    print(f"score={score}, prob_default={prob_default:.6f}")

with open("ml/test_predictions.json", "w") as f:
    json.dump(test_predictions, f, indent=2)
print("Wrote ml/test_predictions.json (for verifying the JS port)")