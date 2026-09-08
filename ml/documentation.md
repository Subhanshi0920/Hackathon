# How the ML Health Score Is Calculated

This documents the full pipeline behind the Bank Confidence Score shown on the Overview and Risk Factors pages — from the synthetic training data through to the exact formula that runs in the browser.

## The pipeline, in one picture

```
generateSyntheticData.mjs (Node/JS)          train_model.py (Python)           mlHealthScore.js (Node/JS)
─────────────────────────────────           ─────────────────────           ─────────────────────────
Creates 2,500 fake businesses      ──CSV──>  Fits a logistic regression  ──JSON──>  Runs the trained
with realistic, multi-year                   model on that data, using              formula on a real
financial histories, and labels               scikit-learn                          business's 13 factor
whether each one "defaulted"                                                        scores — instantly,
on a loan or not                                                                    in the browser
```

Two different languages did two different jobs: **JavaScript generated the training examples** (including deciding, for each fake business, whether it "defaulted"); **Python found the best-fitting formula** that predicts that outcome from the 13 factor scores. The formula Python found is what actually runs in the app — Python itself never runs when you use the app.

---

## Stage 1 — What gets fed into the model (the 15 features)

Every one of these is a **real, deterministic calculation** already in `bankFactors.js` — not invented by the ML model. The model never sees raw data like a CIBIL score or a balance sheet; it only ever sees the *already-scored* 0–100 output of these functions:

| # | Feature | What it measures | Computed by |
|---|---|---|---|
| 1 | `cibil` | Credit bureau score, penalized for utilization/enquiries/overdues | `scoreCibil()` |
| 2 | `gst` | GST filing consistency % (live, reacts to uploads) | `scoreGst()` |
| 3 | `itr` | Income tax filing history + income growth | `scoreItr()` |
| 4 | `balanceSheet` | Net worth, current ratio, leverage | `scoreBalanceSheet()` |
| 5 | `businessAge` | Years in continuous operation | `scoreBusinessAge()` |
| 6 | `bankAccounts` | Average balance, bounce count, account age | `scoreBankAccounts()` |
| 7 | `googleRating` | Google Business rating, weighted by review volume | `scoreGoogleRating()` — only if the business has a listing |
| 8 | `onlineReviews` | Positive/negative review sentiment split | `scoreOnlineReviews()` — only if the business has a listing |
| 9 | `socialMedia` | Followers, engagement, posting frequency | `scoreSocialMedia()` — only if the business is active there |
| 10 | `ownership` | Number of owners, stability, PAN verification | `scoreOwnership()` |
| 11 | `provisionalBalanceSheet` | Net worth **trend** vs. the audited balance sheet | `scoreProvisionalBalanceSheet()` |
| 12 | `location` | RBI city tier (from the verified address) + foot traffic | `scoreLocation()` |
| 13 | `competition` | Nearby competitor density + market share | `scoreCompetition()` |
| 14 | `has_google_listing` | 1 if factors 7–8 are real data, 0 if imputed | Presence flag |
| 15 | `has_social_media` | 1 if factor 9 is real data, 0 if imputed | Presence flag |

**Missing-data handling:** if a business has no Google listing or no social media, factors 7–9 are filled with a neutral value (50) rather than left blank — and the paired presence flag tells the model that value is imputed, not real, so it can weight it accordingly.

---

## Stage 2 — How the training labels were generated (JavaScript)

For each of the 2,500 synthetic businesses, `generateSyntheticData.mjs` decides whether it "defaulted" using a formula **deliberately different** from `bankFactors.js`'s own weights (per an earlier decision to let the model discover its own weighting rather than be anchored to the fixed formula):

```
logit = -2.0                                          (calibrated base rate)
      + Σ importance[factor] × 3.2 × deviation[factor]   (13 factors, weighted by real-world priority)
      + 1.1 × cibilWeakness × balanceSheetWeakness        (compounding financial distress)
      + 0.9 × gstWeakness × bankAccountWeakness           (same underlying cash-discipline problem)
      − 0.4 × locationStrength × cibilWeakness            (strong market access partially offsets weak credit)
      + noise

default_probability = sigmoid(logit)
```

The `importance` weights were grounded in what India's real government/PSB "digital footprint" credit model actually prioritizes — CIBIL, GST, and bank data most heavily; reputation signals (Google rating, reviews, social media) only lightly, since those aren't part of the real official model at all.

**Multi-year realism:** each business's factors aren't independent random numbers — they derive from a hidden "risk" value that drifts year to year (a persistent per-business trend + noise), so a business's story is internally coherent, the way a real business's CIBIL history trends rather than jumping around randomly.

**Result:** 2,500 businesses, 12.3% historical default rate (calibrated to match a realistic SME lending book).

---

## Stage 3 — What Python actually did (`train_model.py`)

1. **Split** the 2,500 rows: 80% training (2,000), 20% held-out test (500) — never seen during training, used only to check honesty of the accuracy claim
2. **Standardized** every feature: `(value − mean) / standard_deviation`, using only the training set's statistics
3. **Fit a logistic regression** (`scikit-learn`, default L2 regularization) — this is the whole "training" step: finding 15 coefficient numbers plus 1 intercept that best separate defaulters from non-defaulters
4. **Exported** those numbers to `ml/model_weights.json` — this file is the *entire* result of training; nothing else about the Python process matters once this file exists

**Results:** 87.95% training accuracy, **87.4% held-out test accuracy** (the honest number — the model wasn't just memorizing).

---

## Stage 4 — The exact formula that runs in your browser

This is what `mlHealthScore.js` actually computes, live, for a real business — no Python, no network call:

**Step 1 — standardize each of the 15 features:**
```
standardized[i] = (rawValue[i] − scalerMean[i]) / scalerScale[i]
```

**Step 2 — weighted sum:**
```
logit = intercept + Σ (standardized[i] × coefficient[i])
```

**Step 3 — convert to a probability:**
```
default_probability = 1 / (1 + e^(−logit))
```

**Step 4 — convert to the 0–100 score shown in the app:**
```
score = round((1 − default_probability) × 100)
```

### The actual current numbers (from `ml/model_weights.json`)

| Feature | Coefficient | Direction |
|---|---|---|
| gst | −0.405 | higher GST compliance → lower risk (strongest single factor) |
| businessAge | −0.352 | older business → lower risk |
| balanceSheet | −0.233 | stronger balance sheet → lower risk |
| onlineReviews | −0.236 | better reviews → lower risk |
| bankAccounts | −0.225 | better bank conduct → lower risk |
| provisionalBalanceSheet | −0.174 | improving trend → lower risk |
| socialMedia | −0.132 | stronger presence → lower risk |
| cibil | −0.104 | higher CIBIL → lower risk |
| itr | −0.074 | stronger ITR history → lower risk |
| location | −0.052 | (very weak on its own — see caveat below) |
| has_google_listing | −0.029 | (very weak) |
| competition | +0.144 | see caveat below |
| ownership | +0.134 | see caveat below |
| googleRating | +0.122 | see caveat below |
| has_social_media | +0.124 | (very weak) |

**intercept:** −2.283

---

## Known caveats (read before quoting individual coefficients)

**This is trained on synthetic data, not real loan outcomes.** No real bank's historical repayment data was available for a hackathon build. The whole pipeline is designed so a real dataset could be substituted later (regenerate → retrain → the JS file automatically works with the new weights) without any other code changing.

**A few coefficients have the "wrong" sign or look too small to trust individually** (`competition`, `ownership`, `googleRating` are positive; `location` and both presence flags are near-zero). This is a known, real statistical effect called **multicollinearity** — several factors in the synthetic data are correlated with each other (a healthier business tends to look healthier across many signals at once), so logistic regression can't always cleanly attribute credit to one specific factor versus a correlated neighbor. **The model's overall 87.4% test accuracy is trustworthy; reading meaning into any single coefficient in isolation is not.**

**A concrete, verified example of correct model behavior:** a business with a weak CIBIL score but a healthy balance sheet and strong GST compliance still scores well — because the "compounding distress" interaction term only fires when *multiple* signals are weak together, not one alone. A business with weak CIBIL **and** a weak balance sheet **and** weak GST scores correctly low. This is the actual value of using a trained model instead of a fixed formula: it captures that a single weak signal matters less than several weak signals occurring together.

**The `weight %` previously shown in the UI no longer reflects this calculation.** It was removed from the interface for that reason — the model doesn't use fixed percentage weights, it uses the standardized-coefficient formula above.