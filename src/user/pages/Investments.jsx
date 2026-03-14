import React, { useEffect, useMemo, useState } from 'react';
import { formatBRL, toNumber } from '../utils/finance';
import { investmentsService, isInvestmentsTableMissing } from '../services/investmentsService';
import { toast } from 'react-toastify';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function Investments() {
  const [investments, setInvestments] = useState([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(true);
  const [investmentsUnavailable, setInvestmentsUnavailable] = useState(false);
  const [savingInvestment, setSavingInvestment] = useState(false);
  const [savingMovementIds, setSavingMovementIds] = useState([]);
  const [savingDetailsIds, setSavingDetailsIds] = useState([]);
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    institution: '',
    annualRate: '10',
    goalAmount: '',
    initialAmount: '',
  });
  const [investmentDrafts, setInvestmentDrafts] = useState({});
  const [movementDrafts, setMovementDrafts] = useState({});
  const [selectedInvestmentId, setSelectedInvestmentId] = useState(null);

  const [initialAmount, setInitialAmount] = useState('1000');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [rate, setRate] = useState(12);
  const [rateInput, setRateInput] = useState('12,00');
  const [years, setYears] = useState('10');

  useEffect(() => {
    async function loadInvestments() {
      setInvestmentsLoading(true);
      try {
        const data = await investmentsService.getInvestments();
        setInvestments(data || []);
        setInvestmentsUnavailable(false);
      } catch (error) {
        if (isInvestmentsTableMissing(error)) {
          setInvestmentsUnavailable(true);
          setInvestments([]);
          toast.warning('Ative o modulo de investimentos executando o SQL create_investments_table.sql no Supabase.');
          return;
        }

        console.error('Erro ao carregar investimentos:', error);
        toast.error('Nao foi possivel carregar seus investimentos.');
      } finally {
        setInvestmentsLoading(false);
      }
    }

    loadInvestments();
  }, []);

  useEffect(() => {
    const details = {};
    const movements = {};

    investments.forEach((investment) => {
      details[investment.id] = {
        annualRate: String(toNumber(investment.annual_rate, 0)),
        goalAmount: String(toNumber(investment.goal_amount, 0)),
      };
      movements[investment.id] = {
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
      };
    });

    setInvestmentDrafts(details);
    setMovementDrafts(movements);
  }, [investments]);

  const clampRate = (value) => Math.min(30, Math.max(0, value));

  const parseRate = (value) => {
    const normalized = String(value).replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? clampRate(parsed) : 0;
  };

  const formatRate = (value) => clampRate(value).toFixed(2).replace('.', ',');

  const safeInitialAmount = Math.max(0, toNumber(initialAmount));
  const safeMonthlyContribution = Math.max(0, toNumber(monthlyContribution));
  const safeRate = clampRate(toNumber(rate));
  const safeYears = Math.max(1, Math.round(toNumber(years, 10)));
  const ratePercent = Math.min((safeRate / 30) * 100, 100);
  const yearsPercent = Math.min((safeYears / 40) * 100, 100);

  const handleRateSliderChange = (event) => {
    const nextRate = parseRate(event.target.value);
    setRate(nextRate);
    setRateInput(formatRate(nextRate));
  };

  const handleRateInputChange = (event) => {
    const rawValue = event.target.value.replace(/[^0-9,.-]/g, '');
    setRateInput(rawValue);

    const nextRate = parseRate(rawValue);
    if (Number.isFinite(nextRate)) {
      setRate(nextRate);
    }
  };

  const handleRateInputBlur = () => {
    setRateInput(formatRate(safeRate));
  };

  const adjustRate = (delta) => {
    const nextRate = clampRate(safeRate + delta);
    setRate(nextRate);
    setRateInput(formatRate(nextRate));
  };

  const projection = useMemo(() => {
    const points = [];
    let total = safeInitialAmount;
    const monthRate = Math.pow(1 + safeRate / 100, 1 / 12) - 1;

    for (let month = 0; month <= safeYears * 12; month++) {
      if (month % 12 === 0) {
        points.push({
          year: month / 12,
          total,
          invested: safeInitialAmount + safeMonthlyContribution * month,
        });
      }
      total = (total + safeMonthlyContribution) * (1 + monthRate);
    }

    return points;
  }, [safeInitialAmount, safeMonthlyContribution, safeRate, safeYears]);

  const finalAmount = projection[projection.length - 1]?.total || 0;
  const totalInvested = safeInitialAmount + safeMonthlyContribution * safeYears * 12;
  const totalInterest = finalAmount - totalInvested;

  const portfolioSummary = useMemo(() => {
    if (!investments.length) {
      return {
        totalCurrent: 0,
        totalGoal: 0,
        averageProgress: 0,
      };
    }

    const totalCurrent = investments.reduce((sum, investment) => sum + toNumber(investment.current_amount), 0);
    const totalGoal = investments.reduce((sum, investment) => sum + toNumber(investment.goal_amount), 0);
    const averageProgress = investments.reduce((sum, investment) => {
      const goal = toNumber(investment.goal_amount, 0);
      const current = toNumber(investment.current_amount, 0);
      if (goal <= 0) return sum;
      return sum + Math.min((current / goal) * 100, 100);
    }, 0) / investments.length;

    return {
      totalCurrent,
      totalGoal,
      averageProgress,
    };
  }, [investments]);

  const selectedInvestment = useMemo(
    () => investments.find((investment) => String(investment.id) === String(selectedInvestmentId)) || null,
    [investments, selectedInvestmentId],
  );

  const handleNewInvestmentChange = (field, value) => {
    setNewInvestment((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateInvestment = async (event) => {
    event.preventDefault();

    if (investmentsUnavailable) {
      toast.warning('Execute o SQL create_investments_table.sql no Supabase para habilitar esta funcionalidade.');
      return;
    }

    if (!newInvestment.name.trim()) {
      toast.error('Informe o nome do investimento.');
      return;
    }

    const annualRate = Math.max(0, toNumber(newInvestment.annualRate, 0));
    const goalAmount = Math.max(0, toNumber(newInvestment.goalAmount, 0));
    const initialAmountValue = Math.max(0, toNumber(newInvestment.initialAmount, 0));

    setSavingInvestment(true);
    try {
      const created = await investmentsService.addInvestment({
        name: newInvestment.name,
        institution: newInvestment.institution,
        annual_rate: annualRate,
        goal_amount: goalAmount,
        current_amount: initialAmountValue,
      });

      setInvestments((prev) => [created, ...prev]);
      setNewInvestment({
        name: '',
        institution: '',
        annualRate: '10',
        goalAmount: '',
        initialAmount: '',
      });

      toast.success('Investimento cadastrado com sucesso.');
    } catch (error) {
      console.error('Erro ao cadastrar investimento:', error);
      const detail = error?.message ? ` (${error.message})` : '';
      toast.error(`Nao foi possivel cadastrar o investimento.${detail}`);
    } finally {
      setSavingInvestment(false);
    }
  };

  const handleInvestmentDraftChange = (investmentId, field, value) => {
    setInvestmentDrafts((prev) => ({
      ...prev,
      [investmentId]: {
        ...prev[investmentId],
        [field]: value,
      },
    }));
  };

  const handleSaveInvestmentDetails = async (investment) => {
    if (investmentsUnavailable) {
      toast.warning('Execute o SQL create_investments_table.sql no Supabase para habilitar esta funcionalidade.');
      return;
    }

    const draft = investmentDrafts[investment.id] || {};
    const annualRate = Math.max(0, toNumber(draft.annualRate, 0));
    const goalAmount = Math.max(0, toNumber(draft.goalAmount, 0));

    setSavingDetailsIds((prev) => [...prev, investment.id]);
    try {
      const updated = await investmentsService.updateInvestment(investment.id, {
        annual_rate: annualRate,
        goal_amount: goalAmount,
      });

      setInvestments((prev) => prev.map((item) => (item.id === investment.id ? updated : item)));
      toast.success('Meta e juros atualizados.');
    } catch (error) {
      console.error('Erro ao atualizar investimento:', error);
      const detail = error?.message ? ` (${error.message})` : '';
      toast.error(`Nao foi possivel atualizar o investimento.${detail}`);
    } finally {
      setSavingDetailsIds((prev) => prev.filter((id) => id !== investment.id));
    }
  };

  const handleMovementDraftChange = (investmentId, field, value) => {
    setMovementDrafts((prev) => ({
      ...prev,
      [investmentId]: {
        ...prev[investmentId],
        [field]: value,
      },
    }));
  };

  const handleRegisterMovement = async (investment, kind) => {
    if (investmentsUnavailable) {
      toast.warning('Execute o SQL create_investments_table.sql no Supabase para habilitar esta funcionalidade.');
      return;
    }

    const draft = movementDrafts[investment.id] || {};
    const amount = Math.max(0, toNumber(draft.amount, 0));

    if (!amount) {
      toast.error('Informe um valor valido para movimentar.');
      return;
    }

    if (!draft.date) {
      toast.error('Informe a data da movimentacao.');
      return;
    }

    setSavingMovementIds((prev) => [...prev, investment.id]);
    try {
      const updated = await investmentsService.registerMovement({
        investmentId: investment.id,
        investmentName: investment.name,
        kind,
        amount,
        date: draft.date,
        description: draft.description,
      });

      setInvestments((prev) => prev.map((item) => (item.id === investment.id ? updated : item)));
      setMovementDrafts((prev) => ({
        ...prev,
        [investment.id]: {
          ...prev[investment.id],
          amount: '',
          description: '',
        },
      }));
      toast.success(kind === 'deposit' ? 'Aporte registrado como saida.' : 'Resgate registrado como entrada.');
    } catch (error) {
      console.error('Erro ao registrar movimentacao de investimento:', error);
      const detail = error?.message ? ` (${error.message})` : '';
      toast.error(`Nao foi possivel registrar a movimentacao.${detail}`);
    } finally {
      setSavingMovementIds((prev) => prev.filter((id) => id !== investment.id));
    }
  };

  return (
    <div className="clar-page">
      <header className="clar-page-header">
        <div>
          <h1>Investimentos</h1>
          <p>Gerencie sua carteira e acompanhe a evolucao de cada meta.</p>
        </div>
      </header>

      <section className="clar-card clar-investments-block">
        <div className="clar-investments-section-head">
          <h2>Minha Carteira</h2>
          <small>Cadastre seus investimentos e faca aportes ou resgates em cada um.</small>
        </div>

        {investmentsUnavailable && (
          <div className="clar-warning-banner" role="status">
            <strong>Modulo de investimentos nao configurado no banco.</strong>
            <span>Execute o arquivo `supabase/create_investments_table.sql` no SQL Editor do Supabase e recarregue a pagina.</span>
          </div>
        )}

        <form className="clar-form-grid clar-investment-create-grid" onSubmit={handleCreateInvestment}>
          <label>
            Nome do investimento
            <input
              value={newInvestment.name}
              onChange={(event) => handleNewInvestmentChange('name', event.target.value)}
              placeholder="Ex.: Tesouro Selic"
            />
          </label>
          <label>
            Instituicao
            <input
              value={newInvestment.institution}
              onChange={(event) => handleNewInvestmentChange('institution', event.target.value)}
              placeholder="Ex.: NuInvest"
            />
          </label>
          <label>
            Juros ao ano (%)
            <input
              type="number"
              min="0"
              step="0.01"
              value={newInvestment.annualRate}
              onChange={(event) => handleNewInvestmentChange('annualRate', event.target.value)}
            />
          </label>
          <label>
            Meta (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={newInvestment.goalAmount}
              onChange={(event) => handleNewInvestmentChange('goalAmount', event.target.value)}
            />
          </label>
          <label>
            Valor inicial (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={newInvestment.initialAmount}
              onChange={(event) => handleNewInvestmentChange('initialAmount', event.target.value)}
            />
          </label>
          <div className="clar-investment-create-action">
            <button type="submit" className="clar-primary-btn" disabled={savingInvestment || investmentsUnavailable}>
              {savingInvestment ? 'Salvando...' : 'Cadastrar investimento'}
            </button>
          </div>
        </form>

        <div className="clar-kpi-grid three">
          <div className="clar-kpi-card neutral">
            <small>Total investido</small>
            <strong>{formatBRL(portfolioSummary.totalCurrent)}</strong>
          </div>
          <div className="clar-kpi-card neutral">
            <small>Meta total</small>
            <strong>{formatBRL(portfolioSummary.totalGoal)}</strong>
          </div>
          <div className="clar-kpi-card highlight">
            <small>Progresso medio</small>
            <strong>{portfolioSummary.averageProgress.toFixed(1)}%</strong>
          </div>
        </div>

        {investmentsLoading ? (
          <div className="clar-investments-list">
            <article className="clar-card skeleton">
              <span className="clar-skeleton-line w70" />
              <span className="clar-skeleton-line w48" />
              <span className="clar-skeleton-line w88" />
              <span className="clar-skeleton-line w64" />
            </article>
            <article className="clar-card skeleton">
              <span className="clar-skeleton-line w68" />
              <span className="clar-skeleton-line w52" />
              <span className="clar-skeleton-line w85" />
              <span className="clar-skeleton-line w55" />
            </article>
          </div>
        ) : investments.length === 0 ? (
          <p className="clar-empty">Nenhum investimento cadastrado ainda. Cadastre o primeiro investimento acima.</p>
        ) : (
          <div className="clar-investments-list">
            {investments.map((investment) => {
              const currentAmount = Math.max(0, toNumber(investment.current_amount, 0));
              const goalAmount = Math.max(0, toNumber(investment.goal_amount, 0));
              const progressPercent = goalAmount > 0 ? Math.min((currentAmount / goalAmount) * 100, 100) : 0;

              return (
                <article key={investment.id} className="clar-inv-card">
                  <div className="clar-inv-card-header">
                    <div>
                      <h3 className="clar-inv-card-name">{investment.name}</h3>
                      {investment.institution && (
                        <small className="clar-inv-card-institution">{investment.institution}</small>
                      )}
                    </div>
                    <span className="clar-inv-card-rate-badge">
                      {toNumber(investment.annual_rate, 0).toFixed(1)}%&thinsp;a.a
                    </span>
                  </div>

                  <div className="clar-inv-card-body">
                    <div className="clar-inv-card-balance">
                      <small>Saldo atual</small>
                      <strong>{formatBRL(currentAmount)}</strong>
                    </div>

                    <div className="clar-inv-card-goal-row">
                      <span>Meta</span>
                      <span>{goalAmount > 0 ? formatBRL(goalAmount) : '—'}</span>
                    </div>

                    <div className="clar-inv-card-progress">
                      <div className="clar-inv-progress-bar">
                        <div style={{ width: `${progressPercent}%` }} />
                      </div>
                      <small>{progressPercent.toFixed(1)}%</small>
                    </div>
                  </div>

                  <div className="clar-inv-card-footer">
                    <button
                      type="button"
                      onClick={() => setSelectedInvestmentId(investment.id)}
                    >
                      Ver mais
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedInvestment && (() => {
          const currentAmount = Math.max(0, toNumber(selectedInvestment.current_amount, 0));
          const goalAmount = Math.max(0, toNumber(selectedInvestment.goal_amount, 0));
          const progressPercent = goalAmount > 0 ? Math.min((currentAmount / goalAmount) * 100, 100) : 0;
          const detailsDraft = investmentDrafts[selectedInvestment.id] || { annualRate: '0', goalAmount: '0' };
          const movementDraft = movementDrafts[selectedInvestment.id] || {
            amount: '',
            date: new Date().toISOString().slice(0, 10),
            description: '',
          };
          const isSavingMovement = savingMovementIds.includes(selectedInvestment.id);
          const isSavingDetails = savingDetailsIds.includes(selectedInvestment.id);

          return (
            <div className="clar-modal-backdrop" onClick={() => setSelectedInvestmentId(null)}>
              <div className="clar-modal-card large" onClick={(event) => event.stopPropagation()}>
                <div className="clar-modal-head">
                  <h3>{selectedInvestment.name}</h3>
                  <button type="button" className="clar-icon-btn" onClick={() => setSelectedInvestmentId(null)}>✕</button>
                </div>

                <div className="clar-investment-head">
                  <div>
                    <small>{selectedInvestment.institution || 'Instituicao nao informada'}</small>
                  </div>
                  <span className="clar-investment-rate">{toNumber(selectedInvestment.annual_rate, 0).toFixed(2)}% a.a</span>
                </div>

                <div className="clar-investment-metrics">
                  <div>
                    <small>Atual</small>
                    <strong>{formatBRL(currentAmount)}</strong>
                  </div>
                  <div>
                    <small>Meta</small>
                    <strong>{formatBRL(goalAmount)}</strong>
                  </div>
                </div>

                <div className="clar-investment-progress">
                  <div className="clar-investment-progress-head">
                    <small>Progresso da meta</small>
                    <b>{progressPercent.toFixed(1)}%</b>
                  </div>
                  <div className="clar-progress-track green">
                    <div style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="clar-investment-panel">
                  <div className="clar-investment-panel-head">
                    <h4>Configuracao</h4>
                  </div>

                  <div className="clar-form-grid clar-investment-edit-grid">
                    <label>
                      Juros ao ano (%)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={detailsDraft.annualRate}
                        onChange={(event) => handleInvestmentDraftChange(selectedInvestment.id, 'annualRate', event.target.value)}
                      />
                    </label>
                    <label>
                      Meta (R$)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={detailsDraft.goalAmount}
                        onChange={(event) => handleInvestmentDraftChange(selectedInvestment.id, 'goalAmount', event.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className="clar-secondary-btn"
                      disabled={isSavingDetails}
                      onClick={() => handleSaveInvestmentDetails(selectedInvestment)}
                    >
                      {isSavingDetails ? 'Salvando...' : 'Salvar meta e juros'}
                    </button>
                  </div>
                </div>

                <div className="clar-investment-panel">
                  <div className="clar-investment-panel-head">
                    <h4>Movimentacao</h4>
                  </div>

                  <div className="clar-form-grid clar-investment-movement-grid">
                    <label>
                      Valor da movimentacao
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={movementDraft.amount}
                        onChange={(event) => handleMovementDraftChange(selectedInvestment.id, 'amount', event.target.value)}
                        placeholder="0,00"
                      />
                    </label>
                    <label>
                      Data
                      <input
                        type="date"
                        value={movementDraft.date}
                        onChange={(event) => handleMovementDraftChange(selectedInvestment.id, 'date', event.target.value)}
                      />
                    </label>
                    <label>
                      Descricao
                      <input
                        value={movementDraft.description}
                        onChange={(event) => handleMovementDraftChange(selectedInvestment.id, 'description', event.target.value)}
                        placeholder="Ex.: Aporte mensal"
                      />
                    </label>
                  </div>

                  <div className="clar-investment-actions">
                    <button
                      type="button"
                      className="clar-primary-btn"
                      disabled={isSavingMovement}
                      onClick={() => handleRegisterMovement(selectedInvestment, 'deposit')}
                    >
                      {isSavingMovement ? 'Processando...' : 'Registrar aporte'}
                    </button>
                    <button
                      type="button"
                      className="clar-secondary-btn"
                      disabled={isSavingMovement}
                      onClick={() => handleRegisterMovement(selectedInvestment, 'withdrawal')}
                    >
                      {isSavingMovement ? 'Processando...' : 'Registrar resgate'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      <section className="clar-card clar-investments-calculator-block">
        <div className="clar-investments-section-head">
          <h2>Calculadora de Investimentos</h2>
          <small>Bloco separado para simulacao de crescimento com juros compostos.</small>
        </div>

        <div className="clar-two-cols investments">
          <article className="clar-card">
            <h3>Parametros</h3>
            <div className="clar-form-grid one">
              <label>Valor Inicial<input type="number" value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)} /></label>
              <label>Aporte Mensal<input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} /></label>
              <label>Taxa de Juros Anual (%)
                <div className="clar-range-row">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.01"
                    value={safeRate}
                    onChange={handleRateSliderChange}
                    style={{ '--range-progress': `${ratePercent}%` }}
                  />
                  <div className="clar-rate-controls">
                    <button type="button" className="clar-rate-step" onClick={() => adjustRate(-0.1)}>-</button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rateInput}
                      onChange={handleRateInputChange}
                      onBlur={handleRateInputBlur}
                      className="clar-range-number"
                    />
                    <button type="button" className="clar-rate-step" onClick={() => adjustRate(0.1)}>+</button>
                  </div>
                </div>
                <small>{safeRate.toFixed(2)}%</small>
              </label>
              <label>Periodo (Anos)
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={safeYears}
                  onChange={(e) => setYears(e.target.value)}
                  style={{ '--range-progress': `${yearsPercent}%` }}
                />
                <small>{safeYears} anos</small>
              </label>
            </div>
          </article>

          <article className="clar-col-stack">
          <div className="clar-kpi-grid three">
            <div className="clar-kpi-card neutral highlight"><small>Valor Final</small><strong>{formatBRL(finalAmount)}</strong></div>
            <div className="clar-kpi-card neutral"><small>Total Investido</small><strong>{formatBRL(totalInvested)}</strong></div>
            <div className="clar-kpi-card income"><small>Total em Juros</small><strong>{formatBRL(totalInterest)}</strong></div>
          </div>

          <div className="clar-card">
            <h3>Projecao de Crescimento</h3>
            <div className="clar-rechart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projection}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }}
                    tickFormatter={(value) => formatBRL(value).replace(',00', '')}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatBRL(value)}
                    labelFormatter={(label) => `Ano ${label}`}
                    contentStyle={{
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="total" name="Patrimônio" stroke="#2563eb" fill="url(#totalGradient)" strokeWidth={2.5} animationDuration={900} />
                  <Area type="monotone" dataKey="invested" name="Investido" stroke="#94a3b8" fill="transparent" strokeDasharray="4 4" strokeWidth={2} animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          </article>
        </div>
      </section>
    </div>
  );
}
