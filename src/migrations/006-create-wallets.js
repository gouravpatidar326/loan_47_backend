/**
 * Migration 006 — Create a wallet for every existing tenant (idempotent).
 */
const Tenant = require('../models/Tenant');
const Wallet = require('../models/Wallet');

async function up() {
  const tenants = await Tenant.find({}).select('_id companyCode currency').lean();
  const summary = [];
  for (const t of tenants) {
    const existing = await Wallet.collection.findOne({ tenantId: t._id });
    if (existing) { summary.push({ tenant: t.companyCode, action: 'exists' }); continue; }
    const now = new Date();
    await Wallet.collection.insertOne({
      tenantId: t._id, currency: t.currency || 'ZAR', status: 'active',
      currentBalance: 0, availableTokens: 0, reservedTokens: 0, consumedTokens: 0,
      purchasedTokens: 0, bonusTokens: 0, lowBalanceThreshold: 100,
      createdAt: now, updatedAt: now,
    });
    summary.push({ tenant: t.companyCode, action: 'created' });
  }
  console.table(summary);
  return summary;
}

async function down() {
  // Only removes empty wallets (no transactions) for safety.
  const WalletTransaction = require('../models/WalletTransaction');
  const wallets = await Wallet.find({}).lean();
  for (const w of wallets) {
    const txns = await WalletTransaction.collection.countDocuments({ tenantId: w.tenantId });
    if (txns === 0) await Wallet.collection.deleteOne({ _id: w._id });
  }
}

module.exports = { up, down };
