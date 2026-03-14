import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, Plus, Search, Sparkles, Trash2, WalletCards } from 'lucide-react';
import { transactionService } from '../services/transactionsService';
import { creditCardService } from '../../shared/services/creditCardService';
import { calculateInstallmentAmounts, calculateInstallmentDueDate } from '../../shared/services/installmentUtils';
import { formatBRL, getDefaultCategoryName, safeDate, toNumber } from '../utils/finance';
import { toast } from 'react-toastify';
import DatePicker from '../../shared/components/DatePicker';
import CategorySelectField from '../components/CategorySelectField';
import { useTransactionCategories } from '../hooks/useTransactionCategories';

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

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateOrder, setDateOrder] = useState('recent');
  const [valueOrder, setValueOrder] = useState('none');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [form, setForm] = useState({
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

  const loadData = async () => {
    setTransactionsLoading(true);
    try {
      const [txData, cardData] = await Promise.all([
        transactionService.getTransactions().catch(() => []),
        creditCardService.getCreditCards().catch(() => []),
      ]);
      setTransactions(txData || []);
      setCards(cardData || []);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableFormCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  useEffect(() => {
    if (!availableFormCategories.length) {
      return;
    }

    const categoryStillAvailable = availableFormCategories.some((category) => category.name === form.category);
    if (!categoryStillAvailable) {
      setForm((prev) => ({
        ...prev,
        category: availableFormCategories[0].name,
      }));
    }
  }, [availableFormCategories, form.category]);

  const cardMap = useMemo(() => {
    const map = new Map();
    cards.forEach((card) => map.set(String(card.id), card));
    return map;
  }, [cards]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    const base = transactions.filter((tx) => {
      const byDescription = tx.description?.toLowerCase().includes(normalizedSearch);
      const byType = typeFilter === 'all' ? true : tx.type === typeFilter;
      return byDescription && byType;
    });

    const sorted = [...base];

    if (valueOrder !== 'none') {
      sorted.sort((a, b) => (valueOrder === 'highest' ? b.amount - a.amount : a.amount - b.amount));
      return sorted;
    }

    sorted.sort((a, b) => {
      const aDate = safeDate(a.date).getTime();
      const bDate = safeDate(b.date).getTime();
      return dateOrder === 'oldest' ? aDate - bDate : bDate - aDate;
    });

    return sorted;
  }, [transactions, search, typeFilter, dateOrder, valueOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const launchPreview = useMemo(() => ({
    amount: form.amount ? formatBRL(toNumber(form.amount)) : 'R$ 0,00',
    typeLabel: form.type === 'income' ? 'Entrada' : 'Saída',
    methodLabel: form.paymentMethod === 'card' ? 'Cartão' : 'Conta / Débito',
    recurringLabel: form.paymentMethod === 'card' ? 'Parcelável' : form.recurring ? 'Recorrente mensal' : 'Lançamento avulso',
  }), [form.amount, form.paymentMethod, form.recurring, form.type]);

  const transactionMetrics = useMemo(() => {
    const incomeCount = filtered.filter((transaction) => transaction.type === 'income').length;
    const expenseCount = filtered.filter((transaction) => transaction.type === 'expense').length;
    const recurringCount = filtered.filter((transaction) => transaction.recurring).length;

    return {
      total: filtered.length,
      incomeCount,
      expenseCount,
      recurringCount,
    };
  }, [filtered]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, dateOrder, valueOrder]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!form.description || !form.amount) {
      toast.error('Preencha descrição e valor.');
      return;
    }

    try {
      if (form.type === 'expense' && form.paymentMethod === 'card' && form.cardId) {
        const card = cardMap.get(String(form.cardId));
        const totalInstallments = Math.max(1, Math.min(24, Number(form.installments) || 1));
        const amounts = calculateInstallmentAmounts(form.amount, totalInstallments, Number(card?.interest_rate) || 0);
        if (!amounts.length) {
          throw new Error('Valor inválido para parcelamento.');
        }
        const dates = amounts.map((_, index) =>
          calculateInstallmentDueDate(
            form.date,
            Number(card?.closing_day) || 1,
            Number(card?.due_day) || 1,
            index + 1,
          ),
        );

        await transactionService.addInstallmentPurchase({
          description: form.description,
          amounts,
          dates,
          category: form.category,
          cardId: form.cardId,
          installmentGroupId: randomGroupId(),
        });
      } else {
        await transactionService.addTransaction({
          description: form.description,
          amount: toNumber(form.amount),
          type: form.type,
          category: form.category,
          recurring: form.recurring,
          date: form.date,
          card_id: form.paymentMethod === 'card' ? form.cardId : null,
          installment_current: 1,
          installment_total: 1,
          installment_group_id: null,
        });
      }

      toast.success('Lançamento salvo com sucesso.');
      setForm((prev) => ({
        ...prev,
        description: '',
        amount: '',
        category: getDefaultCategoryName(prev.type),
        installments: 1,
        recurring: false,
        cardId: '',
      }));
      loadData();
    } catch (err) {
      console.error('Erro ao salvar lançamento:', err);
      const detail = err?.message ? ` (${err.message})` : '';
      toast.error(`Erro ao salvar lançamento.${detail}`);
    }
  };

  const removeTransaction = async (tx) => {
    try {
      if (tx.installment_group_id) {
        await transactionService.deleteInstallmentGroup(tx.installment_group_id);
      } else {
        await transactionService.deleteTransaction(tx.id);
      }
      loadData();
    } catch (err) {
      console.error('Erro ao excluir lançamento:', err);
      toast.error('Erro ao excluir lançamento.');
    }
  };

  return (
    <div className="clar-page">
      <header className="clar-page-header">
        <div>
          <h1>Lançamentos</h1>
          <p>Gerencie entradas, saídas e compras parceladas.</p>
        </div>
        <div className="clar-header-actions">
          <button type="button" className="clar-secondary-btn"><Download size={16} />Exportar</button>
          <button type="button" className="clar-primary-btn"><Plus size={16} />Novo Lançamento</button>
        </div>
      </header>

      <section className="clar-card clar-transactions-composer">
        <div className="clar-transactions-hero">
          <div>
            <small className="clar-transactions-eyebrow">Central de cadastro</small>
            <h2>Novo lançamento</h2>
            <p>Registre entradas, saídas, compras no cartão e recorrências com uma visão imediata do que será salvo.</p>
          </div>
        </div>

        <div className="clar-transactions-composer-grid">
          <form className="clar-launch-form clar-transactions-form" onSubmit={handleCreate}>
            <section className="clar-launch-section">
              <div className="clar-launch-section-head">
                <h4>Dados principais</h4>
                <small>Descrição, valor, data e tipo do lançamento</small>
              </div>

              <div className="clar-form-grid tx">
                <label>Descrição
                  <input value={form.description} placeholder="Ex.: Aluguel, salário, assinatura" onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                </label>
                <label>Valor
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 1.534,91"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  />
                </label>
                <DatePicker
                  label="Data"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
                <label>Tipo
                  <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                    <option value="income">Entrada</option>
                    <option value="expense">Saída</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="clar-launch-section">
              <div className="clar-launch-section-head">
                <h4>Categoria e pagamento</h4>
                <small>Escolha onde classificar e como esse lançamento será pago</small>
              </div>

              <div className="clar-form-grid tx">
                <CategorySelectField
                  transactionType={form.type}
                  value={form.category}
                  onChange={(category) => setForm((prev) => ({ ...prev, category }))}
                  categories={categories}
                  onCreateCategory={createCategory}
                  disabled={categoriesLoading}
                />
                <label>Método
                  <select value={form.paymentMethod} onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                    <option value="cash">Dinheiro / Débito</option>
                    <option value="card">Cartão</option>
                  </select>
                </label>

                {form.paymentMethod === 'card' && (
                  <>
                    <label>Cartão
                      <select value={form.cardId} onChange={(e) => setForm((prev) => ({ ...prev, cardId: e.target.value }))}>
                        <option value="">Selecione...</option>
                        {cards.map((card) => (
                          <option key={card.id} value={card.id}>{card.bank_name}</option>
                        ))}
                      </select>
                    </label>
                    <label>Parcelas
                      <input type="number" min="1" max="24" value={form.installments} onChange={(e) => setForm((prev) => ({ ...prev, installments: e.target.value }))} />
                    </label>
                  </>
                )}
              </div>

              {form.paymentMethod !== 'card' && (
                <label className="clar-launch-toggle-card clar-transactions-toggle-card">
                  <input
                    type="checkbox"
                    checked={form.recurring}
                    onChange={(e) => setForm((prev) => ({ ...prev, recurring: e.target.checked }))}
                  />
                  <div>
                    <strong>Lançamento recorrente mensal</strong>
                    <small>Ideal para salário, aluguel, internet, mensalidades e outras despesas fixas.</small>
                  </div>
                </label>
              )}
            </section>

            <button type="submit" className="clar-primary-btn full">Salvar lançamento</button>
          </form>

          <aside className="clar-transactions-aside">
            <article className={`clar-transactions-preview-card ${form.type}`}>
              <small>Prévia do lançamento</small>
              <strong>{launchPreview.amount}</strong>
              <span>{form.description || 'Descrição do lançamento'}</span>

              <div className="clar-transactions-preview-meta">
                <div>
                  <small>Tipo</small>
                  <b>{launchPreview.typeLabel}</b>
                </div>
                <div>
                  <small>Método</small>
                  <b>{launchPreview.methodLabel}</b>
                </div>
                <div>
                  <small>Categoria</small>
                  <b>{form.category}</b>
                </div>
                <div>
                  <small>Frequência</small>
                  <b>{launchPreview.recurringLabel}</b>
                </div>
              </div>
            </article>

            <div className="clar-transactions-stats">
              {transactionsLoading ? (
                <>
                  <article className="clar-info-skeleton-card"><span className="clar-skeleton-line" style={{ width: '82%' }} /><span className="clar-skeleton-line" style={{ width: '55%', height: 20 }} /></article>
                  <article className="clar-info-skeleton-card"><span className="clar-skeleton-line" style={{ width: '74%' }} /><span className="clar-skeleton-line" style={{ width: '48%', height: 20 }} /></article>
                  <article className="clar-info-skeleton-card"><span className="clar-skeleton-line" style={{ width: '70%' }} /><span className="clar-skeleton-line" style={{ width: '50%', height: 20 }} /></article>
                  <article className="clar-info-skeleton-card"><span className="clar-skeleton-line" style={{ width: '78%' }} /><span className="clar-skeleton-line" style={{ width: '52%', height: 20 }} /></article>
                </>
              ) : (
                <>
                  <article>
                    <small>No resultado atual</small>
                    <strong>{transactionMetrics.total}</strong>
                    <span>lançamentos visíveis</span>
                  </article>
                  <article>
                    <small>Entradas</small>
                    <strong>{transactionMetrics.incomeCount}</strong>
                    <span>itens cadastrados</span>
                  </article>
                  <article>
                    <small>Saídas</small>
                    <strong>{transactionMetrics.expenseCount}</strong>
                    <span>itens cadastrados</span>
                  </article>
                  <article>
                    <small>Recorrentes</small>
                    <strong>{transactionMetrics.recurringCount}</strong>
                    <span>no filtro atual</span>
                  </article>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="clar-card clar-transactions-table-card">
        <div className="clar-table-top">
          <div>
            <h2>Histórico de lançamentos</h2>
            <p>Filtre, ordene e revise tudo o que já foi registrado.</p>
          </div>
          <label className="clar-search">
            <Search size={14} />
            <input placeholder="Buscar por descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        {transactionsLoading ? (
          <div className="clar-transactions-table-skeleton">
            <span className="clar-skeleton-line" style={{ width: '100%', height: 36 }} />
            <span className="clar-skeleton-line" style={{ width: '100%', height: 32 }} />
            <span className="clar-skeleton-line" style={{ width: '100%', height: 32 }} />
            <span className="clar-skeleton-line" style={{ width: '100%', height: 32 }} />
          </div>
        ) : (
        <div className="clar-table-wrap">
          <table className="clar-table">
            <thead>
              <tr>
                <th>
                  <span className="clar-th-with-filter">
                    Data
                    <select value={dateOrder} onChange={(e) => setDateOrder(e.target.value)}>
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
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                      <option value="all">Todos</option>
                      <option value="income">Entradas</option>
                      <option value="expense">Saídas</option>
                    </select>
                  </span>
                </th>
                <th>
                  <span className="clar-th-with-filter">
                    Valor
                    <select value={valueOrder} onChange={(e) => setValueOrder(e.target.value)}>
                      <option value="none">Sem ordenação</option>
                      <option value="highest">Maiores valores</option>
                      <option value="lowest">Menores valores</option>
                    </select>
                  </span>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((tx) => {
                const card = tx.card_id ? cardMap.get(String(tx.card_id)) : null;
                return (
                  <tr key={tx.id}>
                    <td>
                      <span className="clar-transaction-date-chip">{safeDate(tx.date).toLocaleDateString('pt-BR')}</span>
                    </td>
                    <td className="clar-transaction-description-cell">
                      <strong>{tx.description}</strong>
                      {tx.recurring && <small>Recorrente mensal</small>}
                      {tx.installment_total > 1 && (
                        <small>Parcela {tx.installment_current}/{tx.installment_total}</small>
                      )}
                    </td>
                    <td>
                      <span className="clar-transaction-category-pill">{tx.category}</span>
                    </td>
                    <td>
                      <span className={`clar-transaction-type-pill ${tx.type === 'income' ? 'income' : 'expense'}`}>
                        {tx.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className={tx.type === 'income' ? 'income' : 'expense'}>
                      {tx.type === 'income' ? '+' : '-'} {formatBRL(tx.amount)}
                      <small>{card ? `Cartão ${card.bank_name}` : 'Conta corrente'}</small>
                    </td>
                    <td>
                      <button type="button" className="clar-icon-btn" onClick={() => removeTransaction(tx)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        <div className="clar-table-pagination">
          <small>Mostrando {paginatedTransactions.length} de {filtered.length} lançamento(s)</small>
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
      </section>
    </div>
  );
}
