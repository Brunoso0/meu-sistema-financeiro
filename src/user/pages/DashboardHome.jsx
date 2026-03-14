import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { transactionService } from '../services/transactionsService';
import { profileService } from '../../shared/services/profileService';
import {
  formatBRL,
  getCategoryPlanningGroup,
  getDefaultCategoryName,
  getTransactionsForMonth,
  safeDate,
  toNumber,
} from '../utils/finance';
import { creditCardService } from '../../shared/services/creditCardService';
import { calculateInstallmentAmounts, calculateInstallmentDueDate } from '../../shared/services/installmentUtils';
import { toast } from 'react-toastify';
import DatePicker from '../../shared/components/DatePicker';
import CategorySelectField from '../components/CategorySelectField';
import { useTransactionCategories } from '../hooks/useTransactionCategories';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

function randomGroupId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function monthKeyFromDate(dateValue) {
  return String(dateValue || '').slice(0, 7);
}

export default function DashboardHome() {
  const [viewDate, setViewDate] = useState(new Date());
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [creditCards, setCreditCards] = useState([]);
  const [tableTypeFilter, setTableTypeFilter] = useState('all');
  const [tableDateOrder, setTableDateOrder] = useState('recent');
  const [tableValueOrder, setTableValueOrder] = useState('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [savingPaidIds, setSavingPaidIds] = useState([]);
  const [bulkPayingMonth, setBulkPayingMonth] = useState(false);
  const itemsPerPage = 10;
  const [launchForm, setLaunchForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'expense',
    category: getDefaultCategoryName('expense'),
    recurring: false,
    paymentMethod: 'cash',
    cardId: '',
    installments: 1,
  });
  const { categories, categoriesLoading, createCategory } = useTransactionCategories();

  useEffect(() => {
    async function loadData() {
      setDashboardLoading(true);
      try {
        const [txData, profileData, cardData] = await Promise.all([
          transactionService.getTransactions(),
          profileService.getProfile().catch(() => null),
          creditCardService.getCreditCards().catch(() => []),
        ]);
        setTransactions(txData || []);
        setProfile(profileData);
        setCreditCards(cardData || []);
      } finally {
        setDashboardLoading(false);
      }
    }

    loadData();
  }, []);

  const availableLaunchCategories = useMemo(
    () => categories.filter((category) => category.type === launchForm.type),
    [categories, launchForm.type],
  );

  useEffect(() => {
    if (!availableLaunchCategories.length) {
      return;
    }

    const categoryStillAvailable = availableLaunchCategories.some((category) => category.name === launchForm.category);
    if (!categoryStillAvailable) {
      setLaunchForm((prev) => ({
        ...prev,
        category: availableLaunchCategories[0].name,
      }));
    }
  }, [availableLaunchCategories, launchForm.category]);

  const filteredTransactions = useMemo(() => {
    return getTransactionsForMonth(transactions, viewDate);
  }, [transactions, viewDate]);

  const summary = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const totalExpenses = filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const baseIncome = toNumber(profile?.base_income, totalIncome);
    const percentNeeds = toNumber(profile?.percent_needs, 50);
    const percentWants = toNumber(profile?.percent_wants, 30);
    const percentInvestments = toNumber(profile?.percent_investments, 20);

    const needTarget = (baseIncome * percentNeeds) / 100;
    const wantTarget = (baseIncome * percentWants) / 100;
    const investTarget = (baseIncome * percentInvestments) / 100;

    const needsSpent = filteredTransactions
      .filter((tx) => tx.type === 'expense' && getCategoryPlanningGroup(tx.category, tx.type, categories) === 'needs')
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const wantsSpent = filteredTransactions
      .filter((tx) => tx.type === 'expense' && getCategoryPlanningGroup(tx.category, tx.type, categories) === 'wants')
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const investmentsSpent = filteredTransactions
      .filter((tx) => getCategoryPlanningGroup(tx.category, tx.type, categories) === 'investments')
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      needTarget,
      wantTarget,
      investTarget,
      needsSpent,
      wantsSpent,
      investmentsSpent,
      percentNeeds,
      percentWants,
      percentInvestments,
    };
  }, [categories, filteredTransactions, profile]);

  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate);

  const monthlyExpensePaymentStatus = useMemo(() => {
    const expenseRows = filteredTransactions.filter((transaction) => transaction.type === 'expense');
    const paidCount = expenseRows.filter((transaction) => Boolean(transaction.is_paid)).length;
    const pendingAmount = expenseRows
      .filter((transaction) => !Boolean(transaction.is_paid))
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

    return {
      total: expenseRows.length,
      paidCount,
      pendingCount: Math.max(expenseRows.length - paidCount, 0),
      pendingAmount,
    };
  }, [filteredTransactions]);

  const unpaidExpenseRowsForMonth = useMemo(() => (
    filteredTransactions
      .filter((transaction) => (
        transaction.type === 'expense'
        && !Boolean(transaction.is_paid)
        && transaction.id
      ))
  ), [filteredTransactions]);

  const paidExpenseRowsForMonth = useMemo(() => (
    filteredTransactions
      .filter((transaction) => (
        transaction.type === 'expense'
        && Boolean(transaction.is_paid)
        && transaction.id
      ))
  ), [filteredTransactions]);

  const allMonthExpensesMarkedPaid =
    unpaidExpenseRowsForMonth.length === 0 && paidExpenseRowsForMonth.length > 0;

  const monthlySeries = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth() - (5 - index), 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'short' });
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        date,
        label,
        income: 0,
        expense: 0,
      };
    });

    return months.map((month) => {
      const monthTransactions = getTransactionsForMonth(transactions, month.date);
      return {
        ...month,
        income: monthTransactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0),
        expense: monthTransactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0),
      };
    });
  }, [transactions, viewDate]);

  const monthTransactions = useMemo(() => {
    const base = filteredTransactions.filter((transaction) => {
      const byType = tableTypeFilter === 'all' ? true : transaction.type === tableTypeFilter;
      return byType;
    });

    const sorted = [...base];

    if (tableValueOrder !== 'none') {
      sorted.sort((a, b) => (tableValueOrder === 'highest' ? toNumber(b.amount) - toNumber(a.amount) : toNumber(a.amount) - toNumber(b.amount)));
      return sorted;
    }

    sorted.sort((a, b) => {
      const aDate = safeDate(a.date).getTime();
      const bDate = safeDate(b.date).getTime();
      return tableDateOrder === 'oldest' ? aDate - bDate : bDate - aDate;
    });

    return sorted;
  }, [filteredTransactions, tableTypeFilter, tableDateOrder, tableValueOrder]);

  const totalPages = Math.max(1, Math.ceil(monthTransactions.length / itemsPerPage));

  const paginatedMonthTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return monthTransactions.slice(start, start + itemsPerPage);
  }, [monthTransactions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewDate, transactions.length, tableTypeFilter, tableDateOrder, tableValueOrder]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCreateLaunch = async (event) => {
    event.preventDefault();

    if (!launchForm.description || !launchForm.amount) {
      toast.error('Preencha descrição e valor.');
      return;
    }

    try {
      if (launchForm.type === 'expense' && launchForm.paymentMethod === 'card' && launchForm.cardId) {
        const card = creditCards.find((item) => String(item.id) === String(launchForm.cardId));
        const totalInstallments = Math.max(1, Math.min(24, Number(launchForm.installments) || 1));
        const amounts = calculateInstallmentAmounts(
          launchForm.amount,
          totalInstallments,
          Number(card?.interest_rate) || 0,
        );
        if (!amounts.length) {
          throw new Error('Valor inválido para parcelamento.');
        }
        const dates = amounts.map((_, index) =>
          calculateInstallmentDueDate(
            launchForm.date,
            Number(card?.closing_day) || 1,
            Number(card?.due_day) || 1,
            index + 1,
          ),
        );

        await transactionService.addInstallmentPurchase({
          description: launchForm.description,
          amounts,
          dates,
          category: launchForm.category,
          cardId: launchForm.cardId,
          installmentGroupId: randomGroupId(),
        });
      } else {
        await transactionService.addTransaction({
          description: launchForm.description,
          amount: toNumber(launchForm.amount),
          date: launchForm.date,
          type: launchForm.type,
          category: launchForm.category,
          recurring: launchForm.recurring,
          card_id: launchForm.paymentMethod === 'card' ? launchForm.cardId : null,
          installment_current: 1,
          installment_total: 1,
          installment_group_id: null,
        });
      }

      const refreshed = await transactionService.getTransactions();
      setTransactions(refreshed || []);
      setShowLaunchModal(false);
      setLaunchForm((prev) => ({
        ...prev,
        description: '',
        amount: '',
        recurring: false,
        category: getDefaultCategoryName(prev.type),
        cardId: '',
        installments: 1,
      }));
      toast.success('Lançamento salvo com sucesso.');
    } catch (err) {
      console.error('Erro ao salvar lançamento (dashboard):', err);
      const detail = err?.message ? ` (${err.message})` : '';
      toast.error(`Erro ao salvar lançamento.${detail}`);
    }
  };

  const handleToggleExpensePaid = async (tx, checked) => {
    if (!tx?.id || tx.type !== 'expense') {
      return;
    }

    setSavingPaidIds((prev) => [...prev, tx.id]);
    const previous = tx.is_paid;
    const txMonthKey = monthKeyFromDate(tx.date);
    const previousPaidMonths = Array.isArray(tx.paid_months) ? tx.paid_months.map((item) => String(item)) : [];

    setTransactions((prev) => prev.map((item) => (
      item.id === tx.id
        ? (
          item.recurring
            ? {
              ...item,
              paid_months: checked
                ? [...new Set([...(Array.isArray(item.paid_months) ? item.paid_months : []), txMonthKey])]
                : (Array.isArray(item.paid_months) ? item.paid_months : []).filter((month) => month !== txMonthKey),
            }
            : { ...item, is_paid: checked }
        )
        : item
    )));

    try {
      if (tx.recurring) {
        const result = await transactionService.updateRecurringMonthPaidStatus(tx.id, txMonthKey, checked, previousPaidMonths);
        if (result?.degraded) {
          toast.warning('Atualização mensal de recorrentes requer migração no Supabase (paid_months). Usando modo de compatibilidade.');
        }
      } else {
        await transactionService.updateTransactionPaidStatus(tx.id, checked);
      }
    } catch (err) {
      console.error('Erro ao atualizar status de pagamento:', err);
      setTransactions((prev) => prev.map((item) => (
        item.id === tx.id
          ? (item.recurring ? { ...item, paid_months: previousPaidMonths } : { ...item, is_paid: previous })
          : item
      )));
      const detail = err?.message ? ` (${err.message})` : '';
      toast.error(`Não foi possível atualizar o status de pagamento.${detail}`);
    } finally {
      setSavingPaidIds((prev) => prev.filter((id) => id !== tx.id));
    }
  };

  const handleToggleAllMonthExpensesPaid = async (checked) => {
    const rows = checked ? unpaidExpenseRowsForMonth : paidExpenseRowsForMonth;
    const ids = [...new Set(rows.map((row) => row.id))];

    if (!rows.length) {
      return;
    }

    const rowMap = new Map(rows.map((row) => [row.id, row]));

    setBulkPayingMonth(true);
    setSavingPaidIds((prev) => [...new Set([...prev, ...ids])]);
    setTransactions((prev) => prev.map((item) => (
      rowMap.has(item.id)
        ? (
          item.recurring
            ? {
              ...item,
              paid_months: checked
                ? [...new Set([...(Array.isArray(item.paid_months) ? item.paid_months : []), monthKeyFromDate(rowMap.get(item.id)?.date)])]
                : (Array.isArray(item.paid_months) ? item.paid_months : []).filter((month) => month !== monthKeyFromDate(rowMap.get(item.id)?.date)),
            }
            : { ...item, is_paid: checked }
        )
        : item
    )));

    try {
      const results = await Promise.all(rows.map((row) => {
        if (row.recurring) {
          return transactionService.updateRecurringMonthPaidStatus(
            row.id,
            monthKeyFromDate(row.date),
            checked,
            row.paid_months,
          );
        }

        return transactionService.updateTransactionPaidStatus(row.id, checked).then(() => ({ degraded: false }));
      }));

      if (results.some((item) => item?.degraded)) {
        toast.warning('Para recorrentes por mês, execute a migração paid_months no Supabase.');
      }
      toast.success(checked ? 'Saídas do mês marcadas como pagas.' : 'Saídas do mês marcadas como pendentes.');
    } catch (err) {
      console.error('Erro ao atualizar saídas do mês:', err);
      const refreshed = await transactionService.getTransactions().catch(() => null);
      if (refreshed) {
        setTransactions(refreshed);
      }
      const detail = err?.message ? ` (${err.message})` : '';
      toast.error(`Não foi possível atualizar todas as saídas do mês.${detail}`);
    } finally {
      setSavingPaidIds((prev) => prev.filter((id) => !ids.includes(id)));
      setBulkPayingMonth(false);
    }
  };

  const handleRemoveTransaction = async (tx) => {
    if (!tx?.id) {
      return;
    }

    const confirmed = window.confirm('Deseja remover este lançamento?');
    if (!confirmed) {
      return;
    }

    try {
      if (tx.installment_group_id) {
        await transactionService.deleteInstallmentGroup(tx.installment_group_id);
        setTransactions((prev) => prev.filter((item) => item.installment_group_id !== tx.installment_group_id));
      } else {
        await transactionService.deleteTransaction(tx.id);
        setTransactions((prev) => prev.filter((item) => item.id !== tx.id));
      }
      toast.success('Lançamento removido com sucesso.');
    } catch (err) {
      console.error('Erro ao remover lançamento:', err);
      const detail = err?.message ? ` (${err.message})` : '';
      toast.error(`Não foi possível remover o lançamento.${detail}`);
    }
  };

  return (
    <div className="clar-page">
      <header className="clar-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bem-vindo de volta. Aqui está sua visão geral financeira.</p>
        </div>

        <div className="clar-header-actions">
          <div className="clar-month-switcher">
            <button type="button" onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
              <ChevronLeft size={16} />
            </button>
            <span>{monthName}</span>
            <button type="button" onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>

          <button type="button" className="clar-primary-btn" onClick={() => setShowLaunchModal(true)}>
            <Plus size={16} />
            Novo Lançamento
          </button>
        </div>
      </header>

      <section className="clar-kpi-grid">
        {dashboardLoading ? (
          <>
            <article className="clar-kpi-card skeleton">
              <span className="clar-skeleton-line" style={{ width: '42%' }} />
              <span className="clar-skeleton-line" style={{ width: '68%', height: 22 }} />
            </article>
            <article className="clar-kpi-card skeleton">
              <span className="clar-skeleton-line" style={{ width: '38%' }} />
              <span className="clar-skeleton-line" style={{ width: '64%', height: 22 }} />
            </article>
            <article className="clar-kpi-card skeleton">
              <span className="clar-skeleton-line" style={{ width: '44%' }} />
              <span className="clar-skeleton-line" style={{ width: '72%', height: 22 }} />
            </article>
            <article className="clar-kpi-card skeleton">
              <span className="clar-skeleton-line" style={{ width: '54%' }} />
              <span className="clar-skeleton-line" style={{ width: '62%', height: 22 }} />
              <span className="clar-skeleton-line" style={{ width: '48%' }} />
            </article>
          </>
        ) : (
          <>
            <article className="clar-kpi-card income">
              <small>Renda Mensal</small>
              <strong>{formatBRL(summary.totalIncome)}</strong>
            </article>
            <article className="clar-kpi-card expense">
              <small>Despesas</small>
              <strong>{formatBRL(summary.totalExpenses)}</strong>
            </article>
            <article className="clar-kpi-card neutral">
              <small>Saldo Previsto</small>
              <strong>{formatBRL(summary.balance)}</strong>
            </article>
            <article className="clar-kpi-card neutral">
              <small>Saídas Pendentes</small>
              <strong>{monthlyExpensePaymentStatus.pendingCount} / {monthlyExpensePaymentStatus.total}</strong>
              <small>Total a pagar: {formatBRL(monthlyExpensePaymentStatus.pendingAmount)}</small>
            </article>
          </>
        )}
      </section>

      <section className="clar-two-cols">
        <article className="clar-card">
          <h2>Evolução Financeira</h2>
          {dashboardLoading ? (
            <div className="clar-dashboard-chart-skeleton" />
          ) : monthlySeries.every((item) => item.income === 0 && item.expense === 0) ? (
            <p className="clar-empty">Sem dados suficientes para exibir o gráfico.</p>
          ) : (
            <div className="clar-rechart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                    tickFormatter={(value) => formatBRL(value).replace(',00', '')}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatBRL(value)}
                    contentStyle={{
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                    }}
                  />
                  <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={700} />
                  <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[6, 6, 0, 0]} animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="clar-card">
          <h2>Planejamento 50/30/20</h2>
          {dashboardLoading ? (
            <div className="clar-dashboard-progress-skeleton">
              <span className="clar-skeleton-line" style={{ width: '95%' }} />
              <span className="clar-skeleton-line" style={{ width: '88%' }} />
              <span className="clar-skeleton-line" style={{ width: '92%' }} />
              <span className="clar-skeleton-line" style={{ width: '86%' }} />
              <span className="clar-skeleton-line" style={{ width: '90%' }} />
              <span className="clar-skeleton-line" style={{ width: '84%' }} />
            </div>
          ) : (
            <>
              <div className="clar-progress-item">
                <div className="clar-progress-head">
                  <span>Necessidades ({summary.percentNeeds}%)</span>
                  <small>{formatBRL(summary.needsSpent)} / {formatBRL(summary.needTarget)}</small>
                </div>
                <div className="clar-progress-track"><div style={{ width: `${Math.min((summary.needsSpent / (summary.needTarget || 1)) * 100, 100)}%` }} /></div>
              </div>

              <div className="clar-progress-item">
                <div className="clar-progress-head">
                  <span>Desejos ({summary.percentWants}%)</span>
                  <small>{formatBRL(summary.wantsSpent)} / {formatBRL(summary.wantTarget)}</small>
                </div>
                <div className="clar-progress-track amber"><div style={{ width: `${Math.min((summary.wantsSpent / (summary.wantTarget || 1)) * 100, 100)}%` }} /></div>
              </div>

              <div className="clar-progress-item">
                <div className="clar-progress-head">
                  <span>Investimentos ({summary.percentInvestments}%)</span>
                  <small>{formatBRL(summary.investmentsSpent)} / {formatBRL(summary.investTarget)}</small>
                </div>
                <div className="clar-progress-track green"><div style={{ width: `${Math.min((summary.investmentsSpent / (summary.investTarget || 1)) * 100, 100)}%` }} /></div>
              </div>
            </>
          )}
        </article>
      </section>

      <section className="clar-card">
        <h2>Entradas e Saídas de {monthName}</h2>
        <p className="clar-inline-hint">
          Pagas: <strong>{monthlyExpensePaymentStatus.paidCount}</strong> | Pendentes: <strong>{monthlyExpensePaymentStatus.pendingCount}</strong>
        </p>
        {dashboardLoading ? (
          <div className="clar-dashboard-table-skeleton">
            <span className="clar-skeleton-line" style={{ width: '100%', height: 36 }} />
            <span className="clar-skeleton-line" style={{ width: '100%', height: 32 }} />
            <span className="clar-skeleton-line" style={{ width: '100%', height: 32 }} />
            <span className="clar-skeleton-line" style={{ width: '100%', height: 32 }} />
          </div>
        ) : monthTransactions.length === 0 ? (
          <p className="clar-empty">Nenhum lançamento para este mês.</p>
        ) : (
          <>
            <div className="clar-table-wrap">
              <table className="clar-table">
                <thead>
                  <tr>
                    <th>
                      <span className="clar-th-with-filter">
                        Data
                        <select value={tableDateOrder} onChange={(e) => setTableDateOrder(e.target.value)}>
                          <option value="recent">Mais recentes</option>
                          <option value="oldest">Mais antigos</option>
                        </select>
                      </span>
                    </th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>
                      <span className="clar-th-with-filter">
                        Tipo
                        <select value={tableTypeFilter} onChange={(e) => setTableTypeFilter(e.target.value)}>
                          <option value="all">Todos</option>
                          <option value="income">Entradas</option>
                          <option value="expense">Saídas</option>
                        </select>
                      </span>
                    </th>
                    <th>
                      <span className="clar-th-with-filter">
                        Valor
                        <select value={tableValueOrder} onChange={(e) => setTableValueOrder(e.target.value)}>
                          <option value="none">Sem ordenação</option>
                          <option value="highest">Maiores valores</option>
                          <option value="lowest">Menores valores</option>
                        </select>
                      </span>
                    </th>
                    <th>
                      <span className="clar-paid-head">
                        <span>Pago?</span>
                        <label className="clar-paid-check clar-paid-all">
                          <input
                            type="checkbox"
                            checked={allMonthExpensesMarkedPaid}
                              disabled={bulkPayingMonth || (unpaidExpenseRowsForMonth.length === 0 && paidExpenseRowsForMonth.length === 0)}
                            onChange={(event) => handleToggleAllMonthExpensesPaid(event.target.checked)}
                            title="Marcar/desmarcar todas as saídas do mês"
                          />
                          <span>{bulkPayingMonth ? 'Salvando...' : 'Mês'}</span>
                        </label>
                      </span>
                    </th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMonthTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{safeDate(tx.date).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <strong>{tx.description}</strong>
                        {tx.recurring && (
                          <small>{tx.is_projected_recurring ? 'Recorrente projetado para este mês' : 'Recorrente mensal'}</small>
                        )}
                      </td>
                      <td>{tx.category}</td>
                      <td>{tx.type === 'income' ? 'Entrada' : 'Saída'}</td>
                      <td className={tx.type === 'income' ? 'income' : 'expense'}>
                        {tx.type === 'income' ? '+' : '-'} {formatBRL(tx.amount)}
                      </td>
                      <td>
                        {tx.type === 'expense' ? (
                          <label className={`clar-paid-check ${tx.is_paid ? 'done' : ''}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(tx.is_paid)}
                              disabled={savingPaidIds.includes(tx.id)}
                              onChange={(event) => handleToggleExpensePaid(tx, event.target.checked)}
                            />
                            <span>{tx.is_paid ? 'Pago' : 'Pendente'}</span>
                          </label>
                        ) : (
                          <span className="clar-paid-check na">N/A</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="clar-icon-btn"
                          onClick={() => handleRemoveTransaction(tx)}
                          title="Remover lançamento"
                          aria-label="Remover lançamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="clar-table-pagination">
              <small>Mostrando {paginatedMonthTransactions.length} de {monthTransactions.length} lançamento(s)</small>
              <div className="clar-page-buttons">
                <button
                  type="button"
                  className="clar-secondary-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </button>
                <span>Página {currentPage} de {totalPages}</span>
                <button
                  type="button"
                  className="clar-secondary-btn"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {showLaunchModal && (
        <div className="clar-modal-backdrop" onClick={() => setShowLaunchModal(false)}>
          <div className="clar-modal-card large" onClick={(event) => event.stopPropagation()}>
            <div className="clar-launch-hero">
              <div>
                <small className="clar-launch-eyebrow">Registro rápido</small>
                <h3>Novo Lançamento</h3>
                <p>Cadastre entradas, saídas e recorrências mensais usando categorias privadas da sua conta.</p>
              </div>
              
            </div>

            <div className="clar-modal-head">
              <div className="clar-launch-preview">
                <small>Prévia</small>
                <strong className={launchForm.type === 'income' ? 'income' : 'expense'}>
                  {launchForm.amount ? formatBRL(toNumber(launchForm.amount)) : 'R$ 0,00'}
                </strong>
                <span>{launchForm.description || 'Descrição do lançamento'}</span>
              </div>
              <button type="button" className="clar-icon-btn" onClick={() => setShowLaunchModal(false)}>✕</button>
            </div>

            <form className="clar-launch-form" onSubmit={handleCreateLaunch}>
              <section className="clar-launch-section">
                <div className="clar-launch-section-head">
                  <h4>Detalhes</h4>
                  <small>Informações básicas do lançamento</small>
                </div>

                <div className="clar-form-grid tx">
                  <label>Descrição
                    <input value={launchForm.description} onChange={(e) => setLaunchForm((prev) => ({ ...prev, description: e.target.value }))} />
                  </label>
                  <label>Valor
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex.: 999,99"
                      value={launchForm.amount}
                      onChange={(e) => setLaunchForm((prev) => ({ ...prev, amount: e.target.value }))}
                    />
                  </label>
                  <DatePicker
                    label="Data"
                    value={launchForm.date}
                    onChange={(e) => setLaunchForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                  <label>Tipo
                    <select value={launchForm.type} onChange={(e) => setLaunchForm((prev) => ({ ...prev, type: e.target.value }))}>
                      <option value="income">Entrada</option>
                      <option value="expense">Saída</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="clar-launch-section">
                <div className="clar-launch-section-head">
                  <h4>Categoria e pagamento</h4>
                  <small>Defina a categoria e como esse valor entra no fluxo financeiro</small>
                </div>

                <div className="clar-form-grid tx">
                  <CategorySelectField
                    transactionType={launchForm.type}
                    value={launchForm.category}
                    onChange={(category) => setLaunchForm((prev) => ({ ...prev, category }))}
                    categories={categories}
                    onCreateCategory={createCategory}
                    disabled={categoriesLoading}
                  />

                  <label>Método
                    <select value={launchForm.paymentMethod} onChange={(e) => setLaunchForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                      <option value="cash">Dinheiro / Débito</option>
                      <option value="card">Cartão</option>
                    </select>
                  </label>

                  {launchForm.paymentMethod === 'card' && (
                    <>
                      <label>Cartão
                        <select value={launchForm.cardId} onChange={(e) => setLaunchForm((prev) => ({ ...prev, cardId: e.target.value }))}>
                          <option value="">Selecione...</option>
                          {creditCards.map((card) => (
                            <option key={card.id} value={card.id}>{card.bank_name}</option>
                          ))}
                        </select>
                      </label>
                      <label>Parcelas
                        <input type="number" min="1" max="24" value={launchForm.installments} onChange={(e) => setLaunchForm((prev) => ({ ...prev, installments: e.target.value }))} />
                      </label>
                    </>
                  )}
                </div>

                {launchForm.paymentMethod !== 'card' && (
                  <label className="clar-launch-toggle-card">
                    <input
                      type="checkbox"
                      checked={launchForm.recurring}
                      onChange={(e) => setLaunchForm((prev) => ({ ...prev, recurring: e.target.checked }))}
                    />
                    <div>
                      <strong>Lançamento recorrente mensal</strong>
                      <small>O valor será considerado automaticamente em cada mês a partir desta data.</small>
                    </div>
                  </label>
                )}
              </section>

              <div className="clar-modal-actions tx-actions">
                <button type="button" className="clar-secondary-btn" onClick={() => setShowLaunchModal(false)}>Cancelar</button>
                <button type="submit" className="clar-primary-btn">Salvar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
