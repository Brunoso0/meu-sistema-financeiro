import React, { useMemo } from 'react';
import { transactionService } from '../services/transactionsService';
import { formatBRL, toNumber } from '../utils/finance';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const categoryColors = ['#10b981', '#ef4444', '#2563eb', '#f59e0b', '#8b5cf6', '#94a3b8'];

export default function Reports() {
  const [transactions, setTransactions] = React.useState([]);

  React.useEffect(() => {
    transactionService.getTransactions().then((data) => setTransactions(data || [])).catch(() => setTransactions([]));
  }, []);

  const categoryData = useMemo(() => {
    const map = new Map();
    transactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => map.set(tx.category || 'Outros', (map.get(tx.category || 'Outros') || 0) + toNumber(tx.amount)));

    return Array.from(map.entries())
      .map(([name, value], index) => ({ name, value, color: categoryColors[index % categoryColors.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions]);

  const monthly = useMemo(() => {
    const map = new Map();
    transactions.forEach((tx) => {
      const date = new Date(`${tx.date}T12:00:00`);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const item = map.get(key) || { label: date.toLocaleDateString('pt-BR', { month: 'short' }), income: 0, expense: 0 };
      if (tx.type === 'income') item.income += toNumber(tx.amount);
      else item.expense += toNumber(tx.amount);
      map.set(key, item);
    });

    return Array.from(map.values()).slice(-6);
  }, [transactions]);

  return (
    <div className="clar-page">
      <header className="clar-page-header">
        <div>
          <h1>Relatórios</h1>
          <p>Análise detalhada da sua saúde financeira.</p>
        </div>
      </header>

      <section className="clar-two-cols">
        <article className="clar-card">
          <h2>Gastos por Categoria</h2>
          {categoryData.length === 0 ? (
            <p className="clar-empty">Sem despesas para montar o gráfico de categorias.</p>
          ) : (
            <div className="clar-rechart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={62}
                    outerRadius={100}
                    paddingAngle={3}
                    animationDuration={800}
                  >
                    {categoryData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatBRL(value)}
                    contentStyle={{
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="clar-card">
          <h2>Renda vs Despesas</h2>
          {monthly.length === 0 ? (
            <p className="clar-empty">Sem histórico mensal suficiente para exibir o gráfico.</p>
          ) : (
            <div className="clar-rechart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
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
                  <Legend />
                  <Bar dataKey="income" name="Renda" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={700} />
                  <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <section className="clar-card">
        <h2>Insights Financeiros</h2>
        <div className="clar-insights-grid">
          <div className="insight success">Economia em Alta<br /><small>Seus gastos de lazer reduziram em relação ao mês anterior.</small></div>
          <div className="insight brand">Meta de Investimento<br /><small>Você está próximo de cumprir sua meta mensal de aportes.</small></div>
          <div className="insight danger">Alerta de Categoria<br /><small>Alimentação aumentou acima da média recente.</small></div>
        </div>
      </section>
    </div>
  );
}
