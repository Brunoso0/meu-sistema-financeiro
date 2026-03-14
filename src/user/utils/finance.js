export function formatBRL(value = 0) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

export const DEFAULT_TRANSACTION_CATEGORIES = [
  { name: 'Salário', type: 'income', planningGroup: null, sortOrder: 10 },
  { name: 'Extra', type: 'income', planningGroup: null, sortOrder: 20 },
  { name: 'Investimento', type: 'income', planningGroup: 'investments', sortOrder: 30 },
  { name: 'Reembolso', type: 'income', planningGroup: null, sortOrder: 40 },
  { name: 'Outros', type: 'income', planningGroup: null, sortOrder: 90 },
  { name: 'Moradia', type: 'expense', planningGroup: 'needs', sortOrder: 10 },
  { name: 'Alimentação', type: 'expense', planningGroup: 'needs', sortOrder: 20 },
  { name: 'Transporte', type: 'expense', planningGroup: 'needs', sortOrder: 30 },
  { name: 'Saúde', type: 'expense', planningGroup: 'needs', sortOrder: 40 },
  { name: 'Educação', type: 'expense', planningGroup: 'wants', sortOrder: 50 },
  { name: 'Lazer', type: 'expense', planningGroup: 'wants', sortOrder: 60 },
  { name: 'Investimento', type: 'expense', planningGroup: 'investments', sortOrder: 70 },
  { name: 'Outros', type: 'expense', planningGroup: 'wants', sortOrder: 90 },
];

function normalizeCategoryKey(value = '') {
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultTransactionCategories() {
  return DEFAULT_TRANSACTION_CATEGORIES.map((category, index) => ({
    id: `default-${category.type}-${index}`,
    name: category.name,
    type: category.type,
    planning_group: category.planningGroup,
    sort_order: category.sortOrder,
    user_id: null,
    is_default: true,
  }));
}

export function sortTransactionCategories(categories = []) {
  return [...categories].sort((left, right) => {
    const typeCompare = String(left.type).localeCompare(String(right.type));
    if (typeCompare !== 0) return typeCompare;

    const leftOrder = Number(left.sort_order ?? left.sortOrder ?? 999);
    const rightOrder = Number(right.sort_order ?? right.sortOrder ?? 999);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    return String(left.name).localeCompare(String(right.name), 'pt-BR');
  });
}

export function getDefaultCategoryName(type = 'expense') {
  const match = DEFAULT_TRANSACTION_CATEGORIES.find((category) => category.type === type);
  return match?.name || 'Outros';
}

export function getCategoryPlanningGroup(categoryName, type, categories = []) {
  const normalizedType = String(type || '').trim();
  const normalizedName = normalizeCategoryKey(categoryName);

  const match = categories.find(
    (category) => category.type === normalizedType && normalizeCategoryKey(category.name) === normalizedName,
  );

  if (match) {
    return match.planning_group ?? match.planningGroup ?? null;
  }

  const fallback = DEFAULT_TRANSACTION_CATEGORIES.find(
    (category) => category.type === normalizedType && normalizeCategoryKey(category.name) === normalizedName,
  );

  return fallback?.planningGroup ?? null;
}

export function safeDate(dateStr) {
  if (!dateStr) return new Date();
  const date = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parsePaidMonths(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function getTransactionsForMonth(transactions = [], viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const lastDayOfMonth = monthEnd.getDate();

  return transactions.flatMap((transaction) => {
    const originalDate = safeDate(transaction.date);
    const sameMonth = originalDate.getFullYear() === year && originalDate.getMonth() === month;

    if (!transaction.recurring) {
      return sameMonth ? [transaction] : [];
    }

    if (originalDate > monthEnd) {
      return [];
    }

    const projectedDate = new Date(year, month, Math.min(originalDate.getDate(), lastDayOfMonth));
    const paidMonths = parsePaidMonths(transaction.paid_months);
    const hasPaidMonthsField = transaction.paid_months !== undefined && transaction.paid_months !== null;

    return [{
      ...transaction,
      date: formatDateOnly(projectedDate),
      original_date: transaction.date,
      paid_months: paidMonths,
      is_paid: hasPaidMonthsField ? paidMonths.includes(monthKey) : Boolean(transaction.is_paid),
      is_projected_recurring: !sameMonth,
    }];
  });
}

export function getCurrentMonthBounds(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end };
}

export function normalizePercentage(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}

export function toNumber(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return fallback;

    const sanitized = raw.replace(/\s/g, '').replace(/[^\d,.-]/g, '');
    if (!sanitized) return fallback;

    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');

    if (lastComma === -1 && lastDot > -1) {
      const parts = sanitized.split('.');
      if (parts.length === 2 && parts[1].length > 2 && /^-?\d+$/.test(`${parts[0]}${parts[1]}`)) {
        const sign = sanitized.startsWith('-') ? '-' : '';
        const digitsOnly = sanitized.replace(/[^\d]/g, '');
        const integerPart = digitsOnly.slice(0, -2) || '0';
        const decimalPart = digitsOnly.slice(-2);
        const parsedHeuristic = Number(`${sign}${integerPart}.${decimalPart}`);
        if (Number.isFinite(parsedHeuristic)) return parsedHeuristic;
      }
    }

    let normalized = sanitized;

    if (lastComma > -1 || lastDot > -1) {
      const decimalSeparator = lastComma > lastDot ? ',' : '.';
      const thousandSeparator = decimalSeparator === ',' ? '.' : ',';

      normalized = normalized.split(thousandSeparator).join('');
      if (decimalSeparator === ',') {
        normalized = normalized.replace(',', '.');
      }
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
