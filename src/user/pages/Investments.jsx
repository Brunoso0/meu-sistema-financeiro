import React, { useMemo, useState } from 'react';
import { formatBRL, toNumber } from '../utils/finance';
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
  const [initialAmount, setInitialAmount] = useState('1000');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [rate, setRate] = useState(12);
  const [rateInput, setRateInput] = useState('12,00');
  const [years, setYears] = useState('10');

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

  return (
    <div className="clar-page">
      <header className="clar-page-header">
        <div>
          <h1>Calculadora de Investimentos</h1>
          <p>Simule crescimento patrimonial com juros compostos em tempo real.</p>
        </div>
      </header>

      <section className="clar-two-cols investments">
        <article className="clar-card">
          <h2>Parâmetros</h2>
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
            <label>Período (Anos)
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
            <h2>Projeção de Crescimento</h2>
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
      </section>
    </div>
  );
}
