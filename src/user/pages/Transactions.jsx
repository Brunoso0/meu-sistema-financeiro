import React, { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Search, Trash2 } from 'lucide-react';
import { transactionService } from '../services/transactionsService';
import { creditCardService } from '../../shared/services/creditCardService';
import { calculateInstallmentAmounts, calculateInstallmentDueDate } from '../../shared/services/installmentUtils';
import { formatBRL, safeDate } from '../utils/finance';
import { toast } from 'react-toastify';
import DatePicker from '../../shared/components/DatePicker';

function randomGroupId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
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
    category: 'Outros',
    recurring: false,
    paymentMethod: 'cash',
    cardId: '',
    installments: 1,
  });

  const loadData = async () => {
    const [txData, cardData] = await Promise.all([
      transactionService.getTransactions().catch(() => []),
      creditCardService.getCreditCards().catch(() => []),
    ]);
    setTransactions(txData || []);
    setCards(cardData || []);
  };

  useEffect(() => {
    loadData();
  }, []);

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
          amount: Number(form.amount),
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
        installments: 1,
        recurring: false,
        cardId: '',
      }));
      loadData();
    } catch {
      toast.error('Erro ao salvar lançamento.');
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
    } catch {
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

      <section className="clar-card">
        <form className="clar-form-grid tx" onSubmit={handleCreate}>
          <label>Descrição
            <input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </label>
          <label>Valor
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
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
          <label>Categoria
            <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
              <option>Moradia</option><option>Alimentação</option><option>Transporte</option>
              <option>Lazer</option><option>Saúde</option><option>Educação</option>
              <option>Investimento</option><option>Outros</option>
            </select>
          </label>
          <label>Método
            <select value={form.paymentMethod} onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
              <option value="cash">Dinheiro/Débito</option>
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

          <button type="submit" className="clar-primary-btn full">Salvar</button>
        </form>
      </section>

      <section className="clar-card">
        <div className="clar-table-top">
          <label className="clar-search">
            <Search size={14} />
            <input placeholder="Buscar por descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

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
                    <td>{safeDate(tx.date).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <strong>{tx.description}</strong>
                      {tx.installment_total > 1 && (
                        <small>Parcela {tx.installment_current}/{tx.installment_total}</small>
                      )}
                    </td>
                    <td>{tx.category}</td>
                    <td>{tx.type === 'income' ? 'Entrada' : 'Saída'}</td>
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
