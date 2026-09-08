// ---------------------------------------------------------------------------
// mlHealthScore.js — the trained logistic regression model, ported to
// plain JS. NOT Python running in the browser — just the learned NUMBERS
// (see ml/model_weights.json) plugged into the same handful of arithmetic
// operations logistic regression always does at prediction time:
// standardize each feature, take a weighted sum, apply sigmoid.
//
// Every one of the 15 input features comes from the REAL
// buildBankFactorAssessment() in bankFactors.js — this file does not
// duplicate or approximate that scoring logic, only consumes its output.
//
// To retrain: rerun ml/generateSyntheticData.mjs then ml/train_model.py,
// and copy the resulting ml/model_weights.json over the one imported here.
// Nothing else in this file needs to change.
// ---------------------------------------------------------------------------

import weights from "../../ml/model_weights.json" with { type: "json" };

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * @param {object} assessment - the return value of buildBankFactorAssessment()
 * @param {object} flags - { hasGoogleListing: boolean, hasSocialMedia: boolean }
 * @returns {{ score: number, defaultProbability: number }}
 */
export function computeMlHealthScore(assessment, flags) {
  const scoreByKey = {};
  for (const f of assessment.FACTORS) scoreByKey[f.key] = f.score;

  // Mean-impute any conditionally-absent factor to neutral (50) — MUST match
  // generateSyntheticData.mjs's imputation exactly, since the model was
  // trained on that convention.
  const get = (key) => scoreByKey[key] ?? 50;

  const rawFeatures = weights.featureNames.map((name) => {
    if (name === "has_google_listing") return flags.hasGoogleListing ? 1 : 0;
    if (name === "has_social_media") return flags.hasSocialMedia ? 1 : 0;
    return get(name);
  });

  const standardized = rawFeatures.map((v, i) => (v - weights.scalerMean[i]) / weights.scalerScale[i]);
  const logit = weights.intercept + standardized.reduce((sum, v, i) => sum + v * weights.coefficients[i], 0);
  const defaultProbability = sigmoid(logit);
  const score = Math.round((1 - defaultProbability) * 100);

  return { score, defaultProbability };
}