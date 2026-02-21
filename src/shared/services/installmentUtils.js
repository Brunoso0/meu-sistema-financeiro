function toCurrencyValue(value) {
  return Number(value.toFixed(2));
}

function clampDay(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function buildDate(year, month, day) {
  return new Date(year, month, clampDay(year, month, day));
}

function addMonths(baseDate, monthsToAdd) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + monthsToAdd;
  return new Date(year, month, 1);
}

export function calculateInstallmentAmounts(totalAmount, installments, monthlyInterestRate) {
  const principal = Number(totalAmount);
  const totalInstallments = Number(installments);
  const rate = Number(monthlyInterestRate) / 100;

  if (!principal || !totalInstallments || totalInstallments < 1) {
    return [];
  }

  if (!rate || rate <= 0) {
    const baseAmount = toCurrencyValue(principal / totalInstallments);
    const amounts = Array.from({ length: totalInstallments }, () => baseAmount);
    const adjustedSum = toCurrencyValue(baseAmount * totalInstallments);
    const diff = toCurrencyValue(principal - adjustedSum);

    if (amounts.length > 0 && diff !== 0) {
      amounts[amounts.length - 1] = toCurrencyValue(amounts[amounts.length - 1] + diff);
    }

    return amounts;
  }

  const factor = (rate * (1 + rate) ** totalInstallments) / ((1 + rate) ** totalInstallments - 1);
  const installmentAmount = toCurrencyValue(principal * factor);

  return Array.from({ length: totalInstallments }, () => installmentAmount);
}

export function calculateInstallmentDueDate(purchaseDate, closingDay, dueDay, installmentIndex = 1) {
  const purchase = new Date(`${purchaseDate}T12:00:00`);
  const purchaseDay = purchase.getDate();
  const statementShift = purchaseDay <= Number(closingDay) ? 0 : 1;

  const statementBase = addMonths(purchase, statementShift + (Number(installmentIndex) - 1));
  const statementYear = statementBase.getFullYear();
  const statementMonth = statementBase.getMonth();

  const dueMonthShift = Number(dueDay) > Number(closingDay) ? 0 : 1;
  const dueBase = buildDate(statementYear, statementMonth + dueMonthShift, Number(dueDay));

  return dueBase.toISOString().split('T')[0];
}