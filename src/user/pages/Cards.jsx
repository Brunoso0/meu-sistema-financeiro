import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, Eye, Pencil, Plus } from 'lucide-react';
import { creditCardService } from '../../shared/services/creditCardService';
import { transactionService } from '../services/transactionsService';
import { formatBRL } from '../utils/finance';
import { toast } from 'react-toastify';

const cardColors = ['purple', 'orange', 'navy'];

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [invoiceCard, setInvoiceCard] = useState(null);
  const [invoiceMonth, setInvoiceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [newCard, setNewCard] = useState({
    bank_name: '',
    closing_day: '',
    due_day: '',
    interest_rate: '0',
    credit_limit: '',
    last_four_digits: '',
  });

  const loadData = async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const [cardData, txData] = await Promise.all([
        creditCardService.getCreditCards().catch(() => []),
        transactionService.getTransactions().catch(() => []),
      ]);

      setCards(cardData || []);
      setTransactions(txData || []);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const cardBills = useMemo(() => {
    return cards.map((card, index) => {
      const used = transactions
        .filter((tx) => (
          tx.card_id
          && String(tx.card_id) === String(card.id)
          && tx.type === 'expense'
          && !Boolean(tx.is_paid)
        ))
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      return {
        ...card,
        used,
        styleColor: cardColors[index % cardColors.length],
      };
    });
  }, [cards, transactions]);

  const invoiceTransactions = useMemo(() => {
    if (!invoiceCard) return [];

    return transactions
      .filter((tx) => {
        if (!tx.card_id || String(tx.card_id) !== String(invoiceCard.id)) return false;
        if (tx.type !== 'expense') return false;
        if (invoiceMonth) {
          return tx.date && tx.date.slice(0, 7) === invoiceMonth;
        }
        return true;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions, invoiceCard, invoiceMonth]);

  const invoiceTotal = useMemo(
    () => invoiceTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0),
    [invoiceTransactions],
  );

  const invoiceStats = useMemo(() => {
    const paidTransactions = invoiceTransactions.filter((tx) => Boolean(tx.is_paid));
    const pendingTransactions = invoiceTransactions.filter((tx) => !Boolean(tx.is_paid));

    return {
      count: invoiceTransactions.length,
      paidCount: paidTransactions.length,
      pendingCount: pendingTransactions.length,
      paidAmount: paidTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0),
      pendingAmount: pendingTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0),
    };
  }, [invoiceTransactions]);

  const invoiceMonthName = useMemo(() => {
    if (!invoiceMonth) return '';
    const [year, month] = invoiceMonth.split('-').map(Number);
    if (!year || !month) return invoiceMonth;

    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, 1));
  }, [invoiceMonth]);

  const changeInvoiceMonth = (offset) => {
    if (!invoiceMonth) return;

    const [year, month] = invoiceMonth.split('-').map(Number);
    if (!year || !month) return;

    const nextMonth = new Date(year, (month - 1) + offset, 1);
    const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    setInvoiceMonth(nextMonthKey);
  };

  const addCard = async () => {
    try {
      await creditCardService.addCreditCard(newCard);
      toast.success('Cartão adicionado com sucesso.');
      setShowAdd(false);
      setNewCard({
        bank_name: '',
        closing_day: '',
        due_day: '',
        interest_rate: '0',
        credit_limit: '',
        last_four_digits: '',
      });
      loadData();
    } catch {
      toast.error('Erro ao adicionar cartão.');
    }
  };

  const openEdit = (card) => {
    setEditCard(card);
    setEditForm({
      bank_name: card.bank_name ?? '',
      closing_day: String(card.closing_day ?? ''),
      due_day: String(card.due_day ?? ''),
      interest_rate: String(card.interest_rate ?? '0'),
      credit_limit: String(card.credit_limit ?? ''),
      last_four_digits: card.last_four_digits ?? '',
    });
  };

  const saveEdit = async () => {
    try {
      await creditCardService.updateCreditCard(editCard.id, editForm);
      toast.success('Cartão atualizado com sucesso.');
      setEditCard(null);
      setEditForm(null);
      loadData();
    } catch (err) {
      console.error('Erro ao atualizar cartão:', err);
      toast.error('Erro ao atualizar cartão.');
    }
  };

  return (
    <div className="clar-page">
      <header className="clar-page-header">
        <div>
          <h1>Meus Cartões</h1>
          <p>Gerencie limites, fechamento e faturas agrupadas.</p>
        </div>
        <button type="button" className="clar-primary-btn" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={16} />
          Adicionar Cartão
        </button>
      </header>

      <section className="clar-cards-grid">
        {isLoading && (
          <>
            <article className="clar-card card-item clar-card-skeleton">
              <div className="clar-card-skeleton-top" />
              <div className="clar-card-skeleton-body">
                <span className="clar-skeleton-line w70" />
                <span className="clar-skeleton-line w55" />
                <span className="clar-skeleton-line w85" />
              </div>
            </article>
            <article className="clar-card card-item clar-card-skeleton">
              <div className="clar-card-skeleton-top" />
              <div className="clar-card-skeleton-body">
                <span className="clar-skeleton-line w68" />
                <span className="clar-skeleton-line w52" />
                <span className="clar-skeleton-line w88" />
              </div>
            </article>
            <article className="clar-card card-item clar-card-skeleton">
              <div className="clar-card-skeleton-top" />
              <div className="clar-card-skeleton-body">
                <span className="clar-skeleton-line w64" />
                <span className="clar-skeleton-line w48" />
                <span className="clar-skeleton-line w82" />
              </div>
            </article>
          </>
        )}

        {!isLoading && cardBills.map((card) => {
          const limit = Number(card.credit_limit) || 0;
          const usage = limit > 0 ? Math.min((Number(card.used) / limit) * 100, 100) : 0;

          return (
            <article key={card.id} className="clar-card card-item">
              <div className={`clar-card-top ${card.styleColor}`}>
                <div>
                  <h3>{card.bank_name}</h3>
                  <small>Número do Cartão</small>
                  <p>•••• •••• •••• {card.last_four_digits || '0000'}</p>
                </div>
                <CreditCard size={24} />
              </div>

              <div className="clar-card-body">
                <div className="clar-card-bill">
                  <div>
                    <small>Limite em uso</small>
                    <strong>{formatBRL(card.used)}</strong>
                  </div>
                  <div>
                    <small>Fecha dia</small>
                    <strong>{card.closing_day}</strong>
                  </div>
                </div>

                <div className="clar-progress-track"><div style={{ width: `${usage}%` }} /></div>
                <small>{usage.toFixed(0)}% do limite {formatBRL(limit)}</small>

                <div className="clar-card-actions">
                  <button type="button" className="clar-secondary-btn" onClick={() => setInvoiceCard(card)}><Eye size={14} />Ver Fatura</button>
                  <button type="button" className="clar-icon-btn" title="Editar cartão" onClick={() => openEdit(card)}><Pencil size={15} /></button>
                </div>
              </div>
            </article>
          );
        })}

        {!isLoading && (
          <button type="button" className="clar-card-add-tile" onClick={() => setShowAdd(true)}>
          <div className="clar-card-add-icon">+</div>
          <strong>Novo Cartão</strong>
          <small>Adicione um novo cartão de crédito para gerenciar.</small>
          </button>
        )}
      </section>

      {showAdd && (
        <div className="clar-modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="clar-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="clar-modal-head">
              <h3>Novo Cartão</h3>
              <button type="button" className="clar-icon-btn" onClick={() => setShowAdd(false)}>✕</button>
            </div>

            <div className="clar-form-grid three">
              <label>Banco<input value={newCard.bank_name} onChange={(e) => setNewCard((p) => ({ ...p, bank_name: e.target.value }))} /></label>
              <label>Fechamento<input type="number" min="1" max="31" value={newCard.closing_day} onChange={(e) => setNewCard((p) => ({ ...p, closing_day: e.target.value }))} /></label>
              <label>Vencimento<input type="number" min="1" max="31" value={newCard.due_day} onChange={(e) => setNewCard((p) => ({ ...p, due_day: e.target.value }))} /></label>
              <label>Juros (%)<input type="number" step="0.01" value={newCard.interest_rate} onChange={(e) => setNewCard((p) => ({ ...p, interest_rate: e.target.value }))} /></label>
              <label>Limite<input type="number" value={newCard.credit_limit} onChange={(e) => setNewCard((p) => ({ ...p, credit_limit: e.target.value }))} /></label>
              <label>Últimos 4 dígitos<input maxLength="4" value={newCard.last_four_digits} onChange={(e) => setNewCard((p) => ({ ...p, last_four_digits: e.target.value }))} /></label>
            </div>

            <div className="clar-modal-actions">
              <button type="button" className="clar-secondary-btn" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button type="button" className="clar-primary-btn" onClick={addCard}>Salvar Cartão</button>
            </div>
          </div>
        </div>
      )}

      {invoiceCard && (
        <div className="clar-modal-backdrop" onClick={() => setInvoiceCard(null)}>
          <div className="clar-modal-card large" onClick={(event) => event.stopPropagation()}>
            <div className="clar-modal-head">
              <h3>Fatura — {invoiceCard.bank_name}</h3>
              <button type="button" className="clar-icon-btn" onClick={() => setInvoiceCard(null)}>✕</button>
            </div>

            <div className="clar-invoice-hero">
              <div>
                <small>Resumo da fatura</small>
                <strong>{invoiceMonthName}</strong>
                <p>
                  Fechamento dia {invoiceCard.closing_day} • Vencimento dia {invoiceCard.due_day}
                </p>
              </div>

              <div className="clar-invoice-month-control">
                <small>Mês da fatura</small>
                <div className="clar-month-switcher clar-invoice-month-switcher">
                  <button type="button" onClick={() => changeInvoiceMonth(-1)} aria-label="Mês anterior">
                    <ChevronLeft size={16} />
                  </button>
                  <span>{invoiceMonthName}</span>
                  <button type="button" onClick={() => changeInvoiceMonth(1)} aria-label="Próximo mês">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="clar-invoice-stats-grid">
              <article>
                <small>Total da fatura</small>
                <strong className="expense">{formatBRL(invoiceTotal)}</strong>
              </article>
              <article>
                <small>Pagamentos realizados</small>
                <strong className="income">{formatBRL(invoiceStats.paidAmount)}</strong>
                <span>{invoiceStats.paidCount} item(ns)</span>
              </article>
              <article>
                <small>Valor pendente</small>
                <strong className="expense">{formatBRL(invoiceStats.pendingAmount)}</strong>
                <span>{invoiceStats.pendingCount} item(ns)</span>
              </article>
              <article>
                <small>Lançamentos no mês</small>
                <strong>{invoiceStats.count}</strong>
                <span>total registrado</span>
              </article>
            </div>

            {invoiceTransactions.length === 0 ? (
              <p className="clar-empty">Nenhum gasto encontrado para {invoiceCard.bank_name} em {invoiceMonth.slice(5, 7)}/{invoiceMonth.slice(0, 4)}.</p>
            ) : (
              <div className="clar-table-wrap">
                <table className="clar-table clar-invoice-table">
                  <thead>
                    <tr>
                      <th>Vencimento</th>
                      <th>Descrição</th>
                      <th>Parcela</th>
                      <th>Status</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{new Date(`${tx.date}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                        <td>{tx.description}</td>
                        <td>{tx.installment_total > 1 ? `${tx.installment_current}/${tx.installment_total}` : '—'}</td>
                        <td>
                          <span className={`clar-invoice-status-pill ${tx.is_paid ? 'paid' : 'pending'}`}>
                            {tx.is_paid ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="expense">- {formatBRL(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}><strong>Total da fatura</strong></td>
                      <td className="expense"><strong>- {formatBRL(invoiceTotal)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {editCard && editForm && (
        <div className="clar-modal-backdrop" onClick={() => setEditCard(null)}>
          <div className="clar-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="clar-modal-head">
              <h3>Editar Cartão</h3>
              <button type="button" className="clar-icon-btn" onClick={() => setEditCard(null)}>✕</button>
            </div>

            <div className="clar-form-grid three">
              <label>Banco<input value={editForm.bank_name} onChange={(e) => setEditForm((p) => ({ ...p, bank_name: e.target.value }))} /></label>
              <label>Fechamento<input type="number" min="1" max="31" value={editForm.closing_day} onChange={(e) => setEditForm((p) => ({ ...p, closing_day: e.target.value }))} /></label>
              <label>Vencimento<input type="number" min="1" max="31" value={editForm.due_day} onChange={(e) => setEditForm((p) => ({ ...p, due_day: e.target.value }))} /></label>
              <label>Juros (%)<input type="number" step="0.01" value={editForm.interest_rate} onChange={(e) => setEditForm((p) => ({ ...p, interest_rate: e.target.value }))} /></label>
              <label>Limite<input type="number" value={editForm.credit_limit} onChange={(e) => setEditForm((p) => ({ ...p, credit_limit: e.target.value }))} /></label>
              <label>Últimos 4 dígitos<input maxLength="4" value={editForm.last_four_digits} onChange={(e) => setEditForm((p) => ({ ...p, last_four_digits: e.target.value }))} /></label>
            </div>

            <div className="clar-modal-actions">
              <button type="button" className="clar-secondary-btn" onClick={() => setEditCard(null)}>Cancelar</button>
              <button type="button" className="clar-primary-btn" onClick={saveEdit}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
