import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Eye, Plus } from 'lucide-react';
import { creditCardService } from '../../shared/services/creditCardService';
import { transactionService } from '../services/transactionsService';
import { formatBRL } from '../utils/finance';
import { toast } from 'react-toastify';

const cardColors = ['purple', 'orange', 'navy'];

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [invoiceCard, setInvoiceCard] = useState(null);
  const [newCard, setNewCard] = useState({
    bank_name: '',
    closing_day: '',
    due_day: '',
    interest_rate: '0',
    credit_limit: '',
    last_four_digits: '',
  });

  const loadData = async () => {
    const [cardData, txData] = await Promise.all([
      creditCardService.getCreditCards().catch(() => []),
      transactionService.getTransactions().catch(() => []),
    ]);

    setCards(cardData || []);
    setTransactions(txData || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const cardBills = useMemo(() => {
    return cards.map((card, index) => {
      const used = transactions
        .filter((tx) => tx.card_id && String(tx.card_id) === String(card.id) && tx.type === 'expense')
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
      .filter((tx) => tx.card_id && String(tx.card_id) === String(invoiceCard.id) && tx.type === 'expense')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, invoiceCard]);

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
        {cardBills.map((card) => {
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
                    <small>Fatura Atual</small>
                    <strong>{formatBRL(card.used)}</strong>
                  </div>
                  <div>
                    <small>Fecha dia</small>
                    <strong>{card.closing_day}</strong>
                  </div>
                </div>

                <div className="clar-progress-track"><div style={{ width: `${usage}%` }} /></div>
                <small>{usage.toFixed(0)}% do limite {formatBRL(limit)}</small>

                <button type="button" className="clar-secondary-btn full" onClick={() => setInvoiceCard(card)}><Eye size={14} />Ver Fatura</button>
              </div>
            </article>
          );
        })}

        <button type="button" className="clar-card-add-tile" onClick={() => setShowAdd(true)}>
          <div className="clar-card-add-icon">+</div>
          <strong>Novo Cartão</strong>
          <small>Adicione um novo cartão de crédito para gerenciar.</small>
        </button>
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
              <h3>Fatura - {invoiceCard.bank_name}</h3>
              <button type="button" className="clar-icon-btn" onClick={() => setInvoiceCard(null)}>✕</button>
            </div>

            {invoiceTransactions.length === 0 ? (
              <p className="clar-empty">Nenhum gasto encontrado para este cartão.</p>
            ) : (
              <div className="clar-table-wrap">
                <table className="clar-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Parcela</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{new Date(`${tx.date}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                        <td>{tx.description}</td>
                        <td>{tx.installment_total > 1 ? `${tx.installment_current}/${tx.installment_total}` : '-'}</td>
                        <td className="expense">- {formatBRL(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
