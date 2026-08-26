/**
 * Helper utility to calculate dynamic Net Worth, Total Assets, and Total Liabilities
 * consistently across the entire WealthPulse application.
 */
export function calculateDynamicNetWorth(investments = [], settings = {}) {
  const safeInvestments = Array.isArray(investments) ? investments : [];

  // 1. Live Investments Portfolio Valuation
  const liveInvestmentsValuation = safeInvestments.reduce(
    (sum, i) => sum + (Number(i.currentValuation) || 0),
    0
  );

  // 2. Additional Assets (Manual input + Custom Itemized Assets)
  const manualAssets = Number(settings.manualAssets || 0);
  const customAssetsList = Array.isArray(settings.customAssetsList) ? settings.customAssetsList : [];
  const customAssetsTotal = customAssetsList.reduce(
    (sum, a) => sum + (Number(a.value) || 0),
    0
  );

  const additionalAssetsTotal = manualAssets + customAssetsTotal;
  const totalAssets = liveInvestmentsValuation + additionalAssetsTotal;

  // 3. Total Liabilities (Manual input + Custom Itemized Liabilities)
  const manualLiabilities = Number(settings.manualLiabilities || 0);
  const customLiabilitiesList = Array.isArray(settings.customLiabilitiesList) ? settings.customLiabilitiesList : [];
  const customLiabilitiesTotal = customLiabilitiesList.reduce(
    (sum, l) => sum + (Number(l.value) || 0),
    0
  );

  const totalLiabilities = manualLiabilities + customLiabilitiesTotal;
  const netWorth = totalAssets - totalLiabilities;

  return {
    liveInvestmentsValuation,
    manualAssets,
    customAssetsList,
    customAssetsTotal,
    additionalAssetsTotal,
    totalAssets,
    manualLiabilities,
    customLiabilitiesList,
    customLiabilitiesTotal,
    totalLiabilities,
    netWorth
  };
}
