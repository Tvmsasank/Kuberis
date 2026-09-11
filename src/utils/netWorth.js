/**
 * Helper utility to calculate dynamic Net Worth, Total Assets, and Total Liabilities
 * consistently across the entire Kuberis application without double-counting.
 */
export function calculateDynamicNetWorth(investments = [], settings = {}) {
  const safeInvestments = Array.isArray(investments) ? investments : [];

  // 1. Live Investments Portfolio Valuation (Stocks + MFs + Crypto + Gold + FDs)
  const liveInvestmentsValuation = safeInvestments.reduce(
    (sum, i) => sum + (Number(i.currentValuation) || 0),
    0
  );

  // 2. Additional Assets (Itemized custom assets OR raw manualAssets input)
  const manualAssets = Number(settings.manualAssets || 0);
  const customAssetsList = Array.isArray(settings.customAssetsList) ? settings.customAssetsList : [];
  const customAssetsTotal = customAssetsList.reduce(
    (sum, a) => sum + (Number(a.value) || 0),
    0
  );

  // Use customAssetsTotal if itemized assets exist; otherwise fallback to manualAssets
  const additionalAssetsTotal = customAssetsList.length > 0 ? customAssetsTotal : manualAssets;
  const totalAssets = liveInvestmentsValuation + additionalAssetsTotal;

  // 3. Total Liabilities (Itemized custom liabilities OR raw manualLiabilities input)
  const manualLiabilities = Number(settings.manualLiabilities || 0);
  const customLiabilitiesList = Array.isArray(settings.customLiabilitiesList) ? settings.customLiabilitiesList : [];
  const customLiabilitiesTotal = customLiabilitiesList.reduce(
    (sum, l) => sum + (Number(l.value) || 0),
    0
  );

  // Use customLiabilitiesTotal if itemized liabilities exist; otherwise fallback to manualLiabilities
  const totalLiabilities = customLiabilitiesList.length > 0 ? customLiabilitiesTotal : manualLiabilities;

  // 4. Net Worth = Total Assets - Total Liabilities
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
