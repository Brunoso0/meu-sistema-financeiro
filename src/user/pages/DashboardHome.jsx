import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { transactionService } from '../services/transactionsService';
import { profileService } from '../../shared/services/profileService';
import { formatBRL, safeDate, toNumber } from '../utils/finance';
import { creditCardService } from '../../shared/services/creditCardService';
import { calculateInstallmentAmounts, calculateInstallmentDueDate } from '../../shared/services/installmentUtils';
import { toast } from 'react-toastify';
import DatePicker from '../../shared/components/DatePicker';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export default function DashboardHome() {
  const [viewDate, setViewDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [creditCards, setCreditCards] = useState([]);
  const [tableTypeFilter, setTableTypeFilter] = useState('all');
  const [tableDateOrder, setTableDateOrder] = useState('recent');
  const [tableValueOrder, setTableValueOrder] = useState('none');
  const [currentPage, setCurrentPage] = useState(1);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const itemsPerPage = 10;
  const [launchForm, setLaunchForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'expense',
    category: 'Outros',
    recurring: false,
    paymentMethod: 'cash',
    cardId: '',
    installments: 1,
  });

  useEffect(() => {
    async function loadData() {
      const [txData, profileData, cardData] = await Promise.all([
        transactionService.getTransactions(),
        profileService.getProfile().catch(() => null),
        creditCardService.getCreditCards().catch(() => []),
      ]);
      setTransactions(txData || []);
      setProfile(profileData);
      setCreditCards(cardData || []);
    }

    loadData();
  }, []);

  const filteredTransactions = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    return transactions.filter((transaction) => {
      const date = safeDate(transaction.date);
      if (transaction.recurring) {
        return date.getFullYear() < year || (date.getFullYear() === year && date.getMonth() <= month);
      }

      return date.getFullYear() === year && date.getMonth() === month;
    });
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
      .filter((tx) => tx.type === 'expense' && ['Moradia', 'Saúde', 'Transporte', 'Alimentação'].includes(tx.category))
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const wantsSpent = filteredTransactions
      .filter((tx) => tx.type === 'expense' && ['Lazer', 'Outros', 'Educação'].includes(tx.category))
      .reduce((sum, tx) => sum + toNumber(tx.amount), 0);

    const investmentsSpent = filteredTransactions
      .filter((tx) => tx.category === 'Investimento' || tx.category === 'investment')
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
  }, [filteredTransactions, profile]);

  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate);

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

    const map = new Map(months.map((month) => [month.key, month]));

    transactions.forEach((transaction) => {
      const date = safeDate(transaction.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = map.get(key);
      if (!bucket) return;

      if (transaction.type === 'income') bucket.income += toNumber(transaction.amount);
      else bucket.expense += toNumber(transaction.amount);
    });

    return months;
  }, [transactions, viewDate]);

  const monthTransactions = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    const base = transactions.filter((transaction) => {
      const date = safeDate(transaction.date);
      const sameMonth = date.getMonth() === month && date.getFullYear() === year;
      const byType = tableTypeFilter === 'all' ? true : transaction.type === tableTypeFilter;
      return sameMonth && byType;
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
  }, [transactions, viewDate, tableTypeFilter, tableDateOrder, tableValueOrder]);

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
          installmentGroupId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
        cardId: '',
        installments: 1,
      }));
      toast.success('Lançamento salvo com sucesso.');
    } catch {
      toast.error('Erro ao salvar lançamento.');
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
      </section>

      <section className="clar-two-cols">
        <article className="clar-card">
          <h2>Evolução Financeira</h2>
          {monthlySeries.every((item) => item.income === 0 && item.expense === 0) ? (
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
        </article>
      </section>

      <section className="clar-card">
        <h2>Entradas e Saídas de {monthName}</h2>
        {monthTransactions.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {paginatedMonthTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{safeDate(tx.date).toLocaleDateString('pt-BR')}</td>
                      <td>{tx.description}</td>
                      <td>{tx.category}</td>
                      <td>{tx.type === 'income' ? 'Entrada' : 'Saída'}</td>
                      <td className={tx.type === 'income' ? 'income' : 'expense'}>
                        {tx.type === 'income' ? '+' : '-'} {formatBRL(tx.amount)}
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
            <div className="clar-modal-head">
              <h3>Novo Lançamento</h3>
              <button type="button" className="clar-icon-btn" onClick={() => setShowLaunchModal(false)}>✕</button>
            </div>

            <form className="clar-form-grid tx" onSubmit={handleCreateLaunch}>
              <label>Descrição
                <input value={launchForm.description} onChange={(e) => setLaunchForm((prev) => ({ ...prev, description: e.target.value }))} />
              </label>
              <label>Valor
                <input type="number" step="0.01" value={launchForm.amount} onChange={(e) => setLaunchForm((prev) => ({ ...prev, amount: e.target.value }))} />
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

              <label>Categoria
                <select value={launchForm.category} onChange={(e) => setLaunchForm((prev) => ({ ...prev, category: e.target.value }))}>
                  <option>Moradia</option><option>Alimentação</option><option>Transporte</option>
                  <option>Lazer</option><option>Saúde</option><option>Educação</option>
                  <option>Investimento</option><option>Outros</option>
                </select>
              </label>

              <label>Método
                <select value={launchForm.paymentMethod} onChange={(e) => setLaunchForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                  <option value="cash">Dinheiro/Débito</option>
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

              {launchForm.paymentMethod !== 'card' && (
                <label className="clar-checkbox-field">
                  <input
                    type="checkbox"
                    checked={launchForm.recurring}
                    onChange={(e) => setLaunchForm((prev) => ({ ...prev, recurring: e.target.checked }))}
                  />
                  <span>Lançamento recorrente mensal</span>
                </label>
              )}

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
