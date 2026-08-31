// ---------------------------------------------------------------------------
// loanMath.js — compound interest calculation, pure and side-effect-free.
//
// NOTE: this deliberately does NOT use a reducing-balance EMI/amortization
// formula. The working capital recommendation this feeds into is an
// "Overdraft facility" with "interest-only draws" (see
// computeWorkingCapitalRecommendation in calculations.js) — the business
// isn't repaying principal in equal monthly installments the way a term
// loan works. Interest genuinely compounds on the outstanding principal
// over the tenure, so a straight compound-interest formula is the correct
// model here, not an EMI amortization schedule.
// ---------------------------------------------------------------------------

const MONTHLY_COMPOUNDING_PERIODS_PER_YEAR = 12;

/**
 * Compound interest, compounded monthly: A = P × (1 + r/12)^(12×t)
 * @param {number} principalLakhs - loan amount, in lakhs
 * @param {number} annualRatePct - annual interest rate, percent (e.g. 12 for 12%)
 * @param {number} tenureMonths - loan tenure, in months
 * @returns {{ avgMonthlyInterestLakhs: number, totalRepaymentLakhs: number, totalInterestLakhs: number }}
 */
export function computeLoanMath(principalLakhs, annualRatePct, tenureMonths) {
  const monthlyRate = annualRatePct / 100 / MONTHLY_COMPOUNDING_PERIODS_PER_YEAR;

  const totalRepaymentLakhs = principalLakhs * Math.pow(1 + monthlyRate, tenureMonths);
  const totalInterestLakhs = totalRepaymentLakhs - principalLakhs;

  // Not a true EMI (there's no fixed installment on an interest-only
  // facility) — this is simply the total interest spread evenly across the
  // tenure, shown so the number is comparable at a glance.
  const avgMonthlyInterestLakhs = totalInterestLakhs / tenureMonths;

  return { avgMonthlyInterestLakhs, totalRepaymentLakhs, totalInterestLakhs };
}