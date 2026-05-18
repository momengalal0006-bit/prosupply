const { calculateTrustScore, recalculateAllTrustScores, getFlaggedSellers } = require('../../utils/trustScore');
const { success } = require('../../utils/response');

const getFlagged = async (req, res, next) => {
  try {
    const flagged = await getFlaggedSellers();
    success(res, flagged);
  } catch (err) { next(err); }
};

const recalculate = async (req, res, next) => {
  try {
    const results = await recalculateAllTrustScores();
    success(res, { message: `Trust scores recalculated for ${results.length} sellers.`, results });
  } catch (err) { next(err); }
};

const getSellerTrust = async (req, res, next) => {
  try {
    const analysis = await calculateTrustScore(req.params.id);
    success(res, analysis);
  } catch (err) { next(err); }
};

module.exports = { getFlagged, recalculate, getSellerTrust };
