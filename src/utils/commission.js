const calculateCommission = (totalPrice) => {
  const amount = parseFloat(totalPrice);
  let commission = 0;
  let rateLabel = '';

  if (amount <= 10000) {
    commission = amount * 0.06;
    rateLabel = '6%';
  } else if (amount <= 50000) {
    commission = 10000 * 0.06 + (amount - 10000) * 0.04;
    rateLabel = '6% + 4%';
  } else {
    commission = 10000 * 0.06 + 40000 * 0.04 + (amount - 50000) * 0.03;
    rateLabel = '6% + 4% + 3%';
  }

  commission = Math.round(commission * 100) / 100;
  const netAmount = Math.round((amount - commission) * 100) / 100;

  return { commission, netAmount, rateLabel };
};

module.exports = { calculateCommission };
