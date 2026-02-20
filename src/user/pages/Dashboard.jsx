import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Plus,
  Trash2,
  Upload,
  Download,
  AlertCircle,
  Target,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { transactionService } from '../services/transactionsService';
import { useAuth } from '../../shared/hooks/useAuth';
import { authService } from '../../shared/services/authService';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import '../styles/dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: 'Outros',
    recurring: false,
    date: todayStr,
  });

  useEffect(() => {
    if (user?.id) {
      loadTransactions();
    }
  }, [user?.id]);

  async function loadTransactions() {
    try {
      setLoading(true);
      const data = await transactionService.getTransactions();
      setTransactions(data);
    } catch {
      toast.error('Erro ao carregar transações.');
    } finally {
      setLoading(false);
    }
  }

  const showMessage = (text, type = 'success') => {
    if (type === 'error') toast.error(text);
    else if (type === 'info') toast.info(text);
    else toast.success(text);
  };

  const safeDate = (dateStr) => {
    try {
      if (!dateStr) return new Date();
      const date = new Date(`${dateStr}T12:00:00`);
      return Number.isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  };

  const changeMonth = (offset) => {
    const nextDate = new Date(viewDate);
    nextDate.setMonth(nextDate.getMonth() + offset);
    setViewDate(nextDate);
  };

  const currentMonthName = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(viewDate);

  const filteredTransactions = useMemo(() => {
    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();

    return transactions.filter((transaction) => {
      const transactionDate = safeDate(transaction.date);
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();

      if (transaction.recurring) {
        return transactionYear < viewYear || (transactionYear === viewYear && transactionMonth <= viewMonth);
      }

      return transactionMonth === viewMonth && transactionYear === viewYear;
    });
  }, [transactions, viewDate]);

  const financialSummary = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((acc, transaction) => acc + Number(transaction.amount), 0);

    const totalExpenses = filteredTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((acc, transaction) => acc + Number(transaction.amount), 0);

    const fixedExpenses = filteredTransactions
      .filter((transaction) => transaction.type === 'expense' && transaction.recurring)
      .reduce((acc, transaction) => acc + Number(transaction.amount), 0);

    const variableExpenses = filteredTransactions
      .filter((transaction) => transaction.type === 'expense' && !transaction.recurring)
      .reduce((acc, transaction) => acc + Number(transaction.amount), 0);

    const balance = totalIncome - totalExpenses;
    const needsLimit = totalIncome * 0.5;
    const wantsLimit = totalIncome * 0.3;
    const savingsGoal = totalIncome * 0.2;
    const availableForVariable = Math.max(0, totalIncome - fixedExpenses - savingsGoal);
    const safeToSpend = Math.max(0, availableForVariable - variableExpenses);

    return {
      totalIncome,
      totalExpenses,
      fixedExpenses,
      variableExpenses,
      balance,
      needsLimit,
      wantsLimit,
      savingsGoal,
      availableForVariable,
      safeToSpend,
    };
  }, [filteredTransactions]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();

    if (!formData.description || !formData.amount || !user?.id) {
      showMessage('Aguarde a conexão com o banco ou preencha os dados.', 'error');
      return;
    }

    try {
      const payload = {
        description: formData.description,
        amount: Number(formData.amount),
        type: formData.type,
        category: formData.category,
        recurring: formData.recurring,
        date: formData.date,
      };

      await transactionService.addTransaction(payload, user.id);
      setFormData({
        description: '',
        amount: '',
        type: formData.type,
        category: 'Outros',
        recurring: false,
        date: formData.date,
      });
      await loadTransactions();
      showMessage('Lançamento salvo na nuvem!', 'success');
    } catch {
      showMessage('Falha ao salvar lançamento na nuvem.', 'error');
    }
  };

  const removeTransaction = async (id) => {
    try {
      await transactionService.deleteTransaction(id);
      await loadTransactions();
      showMessage('Item excluído permanentemente.', 'info');
    } catch {
      showMessage('Falha ao remover item da nuvem.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      showMessage('Logout realizado com sucesso.', 'info');
    } catch {
      showMessage('Erro ao sair da conta.', 'error');
    }
  };

  const exportData = () => {
    try {
      const dataStr = JSON.stringify(transactions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financeiro_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showMessage('Backup salvo no seu computador!', 'success');
    } catch {
      showMessage('Erro ao salvar backup.', 'error');
    }
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = (fileEvent) => {
      try {
        const parsedData = JSON.parse(fileEvent.target?.result || '[]');
        if (Array.isArray(parsedData)) {
          setTransactions(parsedData);
          showMessage('Dados carregados com sucesso!', 'success');
        } else {
          showMessage('Arquivo inválido.', 'error');
        }
      } catch {
        showMessage('Erro ao ler o arquivo.', 'error');
      }
    };
    event.target.value = '';
  };

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="dashboard-container">
      <header className="dashboard-topbar">
        <div className="topbar-main">
          <div className="brand-icon">
            <Wallet size={20} />
          </div>
          <div>
            <h1>Meu Controle Financeiro</h1>
            <p>Gestão Inteligente de Renda</p>
          </div>
        </div>

        <div className="topbar-actions">
          {/* <Button variant="outline" onClick={exportData} icon={Download} className="small-btn">Salvar</Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon={Upload} className="small-btn">
            Carregar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden-input"
            onChange={importData}
            accept=".json"
          /> */}
          <div className="divider" />
          <Button variant="ghost" onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      <div className="month-nav">
        <Button variant="ghost" onClick={() => changeMonth(-1)} className="month-nav-btn">
          <ChevronLeft size={18} />
        </Button>
        <div className="month-label">
          <Calendar size={16} />
          {currentMonthName}
        </div>
        <Button variant="ghost" onClick={() => changeMonth(1)} className="month-nav-btn">
          <ChevronRight size={18} />
        </Button>
      </div>

      <section className="summary-grid">
        <Card className="summary-card income-card">
          <div className="card-title">Renda em {viewDate.toLocaleString('default', { month: 'short' })} <TrendingUp size={18} /></div>
          <div className="card-value">{formatBRL(financialSummary.totalIncome)}</div>
          <div className="card-footer">Previsto para este mês</div>
        </Card>
        <Card className="summary-card expense-card">
          <div className="card-title">Despesas em {viewDate.toLocaleString('default', { month: 'short' })} <TrendingDown size={18} /></div>
          <div className="card-value">{formatBRL(financialSummary.totalExpenses)}</div>
          <div className="card-footer">Fixas: {formatBRL(financialSummary.fixedExpenses)}</div>
        </Card>
        <Card className={`summary-card ${financialSummary.balance >= 0 ? 'balance-card-positive' : 'balance-card-negative'}`}>
          <div className="card-title">Saldo Previsto <DollarSign size={18} /></div>
          <div className={`card-value ${financialSummary.balance >= 0 ? 'positive' : 'negative'}`}>
            {formatBRL(financialSummary.balance)}
          </div>
          <div className="card-footer">Fluxo de Caixa Líquido</div>
        </Card>
      </section>

      <section>
        <div className="planning-header">
          <PieChart size={22} />
          <h2>Planejamento: {currentMonthName}</h2>
        </div>

        <div className="planning-grid">
          <Card className="planning-main-card">
            <h3 className="section-title"><Target size={18} /> Diagnóstico do Mês</h3>

            <div className="diagnostic-row">
              <div>
                <div className="diagnostic-line">
                  <span>Comprometido (Fixo)</span>
                  <strong>{((financialSummary.fixedExpenses / (financialSummary.totalIncome || 1)) * 100).toFixed(1)}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min((financialSummary.fixedExpenses / (financialSummary.totalIncome || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="safe-spend-box">
              <span>Livre para Gastar (Variável)</span>
              <div className="safe-spend-value">{formatBRL(financialSummary.safeToSpend)}</div>
              <p>Valor seguro para gastar, considerando contas fixas e metas de poupança (20%).</p>
            </div>
          </Card>

          <Card>
            <h3 className="section-title">Meta Ideal (50/30/20)</h3>

            <div className="goal-item">
              <div className="goal-label">
                <span className="goal-icon success"><CheckCircle2 size={14} /></span>
                <span>Meta Poupança (20%)</span>
              </div>
              <strong className="goal-value-highlight">{formatBRL(financialSummary.savingsGoal)}</strong>
            </div>

            <div className="goal-item">
              <div className="goal-label">
                <span className="goal-icon warning"><AlertCircle size={14} /></span>
                <span>Teto Essenciais (50%)</span>
              </div>
              <strong>{formatBRL(financialSummary.needsLimit)}</strong>
            </div>

            <div className="goal-item no-border">
              <div className="goal-label">
                <span className="goal-icon info"><TrendingUp size={14} /></span>
                <span>Teto Estilo de Vida (30%)</span>
              </div>
              <strong>{formatBRL(financialSummary.wantsLimit)}</strong>
            </div>
          </Card>
        </div>
      </section>

      <div className="main-content">
        <section className="form-section">
          <Card className="form-card">
            <h3 className="section-title"><Plus size={18} /> Adicionar Lançamento</h3>
            <form onSubmit={handleAddTransaction} className="transaction-form">
              <div className="type-toggle">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className={formData.type === 'income' ? 'active-income' : ''}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={formData.type === 'expense' ? 'active-expense' : ''}
                >
                  Saída
                </button>
              </div>

              <label>
                DESCRIÇÃO
                <input
                  placeholder="Descrição..."
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  VALOR (R$)
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                    required
                  />
                </label>
                <label>
                  DATA
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                    required
                  />
                </label>
              </div>

              <label>
                CATEGORIA
                <select
                  value={formData.category}
                  onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                >
                  {formData.type === 'income' ? (
                    <>
                      <option value="Salário">Salário</option>
                      <option value="Extra">Extra</option>
                      <option value="Investimento">Investimento</option>
                      <option value="Outros">Outros</option>
                    </>
                  ) : (
                    <>
                      <option value="Moradia">Moradia</option>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Educação">Educação</option>
                      <option value="Outros">Outros</option>
                    </>
                  )}
                </select>
              </label>

              <label className="recurring-box">
                <input
                  type="checkbox"
                  checked={formData.recurring}
                  onChange={(event) => setFormData({ ...formData, recurring: event.target.checked })}
                />
                <div className="recurring-content">
                  <span>Repetir todo mês?</span>
                  <small>{formData.type === 'income' ? 'Para salários e renda fixa' : 'Para aluguel, internet, etc'}</small>
                </div>
              </label>

              <Button type="submit" className="full-btn">Salvar Lançamento</Button>
            </form>
          </Card>
        </section>

        <section className="list-section">
          <div className="statement-title">Extrato de {currentMonthName}</div>

          <Card className="statement-card">
            {loading ? (
              <div className="statement-empty">Carregando lançamentos...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="statement-empty">
                <Calendar size={42} />
                <p>Nenhuma transação prevista para este mês.</p>
                <small>Use o formulário para adicionar ou navegue para outros meses.</small>
              </div>
            ) : (
              <div className="statement-list">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="transaction-info">
                      <div className={`icon-box ${transaction.type === 'income' ? 'income-icon' : 'expense-icon'}`}>
                        {transaction.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      <div>
                        <p className="transaction-description">{transaction.description}</p>
                        <div className="transaction-tags">
                          <span className="tag">{transaction.category}</span>
                          {transaction.recurring ? (
                            <span className="tag recurring-tag">Fixa Mensal</span>
                          ) : (
                            <span className="tag date-tag">{safeDate(transaction.date).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="transaction-actions">
                      <span className={transaction.type === 'income' ? 'value-positive' : 'value-negative'}>
                        {transaction.type === 'income' ? '+' : '-'} {formatBRL(transaction.amount)}
                      </span>
                      <button
                        onClick={() => removeTransaction(transaction.id)}
                        className="delete-btn"
                        title="Remover"
                        aria-label="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}