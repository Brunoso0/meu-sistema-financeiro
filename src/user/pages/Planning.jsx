import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { profileService } from '../../shared/services/profileService';
import { goalsService } from '../services/goalsService';
import { formatBRL } from '../utils/finance';
import { toast } from 'react-toastify';

export default function Planning() {
  const [planningLoading, setPlanningLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [goals, setGoals] = useState([]);
  const [editing, setEditing] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [newGoal, setNewGoal] = useState({
    title: '',
    target_amount: '',
    current_amount: '',
  });

  const [form, setForm] = useState({
    base_income: 0,
    percent_needs: 50,
    percent_wants: 30,
    percent_investments: 20,
  });

  useEffect(() => {
    async function load() {
      setPlanningLoading(true);
      const [profileData, goalsData] = await Promise.all([
        profileService.getProfile().catch(() => null),
        goalsService.getGoals().catch(() => []),
      ]);

      if (profileData) {
        setProfile(profileData);
        setForm({
          base_income: Number(profileData.base_income) || 0,
          percent_needs: Number(profileData.percent_needs) || 50,
          percent_wants: Number(profileData.percent_wants) || 30,
          percent_investments: Number(profileData.percent_investments) || 20,
        });
      }

      setGoals(goalsData || []);
      setPlanningLoading(false);
    }

    load();
  }, []);

  const distribution = useMemo(() => {
    const base = Number(form.base_income) || 0;
    return {
      needs: (base * Number(form.percent_needs || 0)) / 100,
      wants: (base * Number(form.percent_wants || 0)) / 100,
      investments: (base * Number(form.percent_investments || 0)) / 100,
    };
  }, [form]);

  const saveConfig = async () => {
    try {
      const updated = await profileService.updatePlanningConfig(form);
      setProfile(updated);
      setEditing(false);
      toast.success('Configurações salvas com sucesso.');
    } catch {
      toast.error('Erro ao salvar configurações.');
    }
  };

  const createGoal = async () => {
    if (!newGoal.title || !newGoal.target_amount) {
      toast.error('Informe título e valor da meta.');
      return;
    }

    try {
      const created = await goalsService.addGoal(newGoal);
      setGoals((prev) => [...prev, created]);
      setNewGoal({ title: '', target_amount: '', current_amount: '' });
      setShowGoalModal(false);
      toast.success('Meta criada com sucesso.');
    } catch {
      toast.error('Erro ao criar meta.');
    }
  };

  const openContributionModal = (goal) => {
    setSelectedGoal(goal);
    setContributionAmount('');
    setShowContributionModal(true);
  };

  const addContributionToGoal = async () => {
    const contribution = Number(contributionAmount);

    if (!selectedGoal) {
      toast.error('Meta inválida.');
      return;
    }

    if (!Number.isFinite(contribution) || contribution <= 0) {
      toast.error('Informe um valor válido para aporte.');
      return;
    }

    try {
      const updatedCurrentAmount = Number(selectedGoal.current_amount || 0) + contribution;

      const updatedGoal = await goalsService.updateGoal(selectedGoal.id, {
        title: selectedGoal.title,
        target_amount: Number(selectedGoal.target_amount || 0),
        current_amount: updatedCurrentAmount,
      });

      setGoals((prev) => prev.map((goal) => (goal.id === updatedGoal.id ? updatedGoal : goal)));
      setShowContributionModal(false);
      setSelectedGoal(null);
      setContributionAmount('');
      toast.success('Aporte adicionado à meta.');
    } catch {
      toast.error('Erro ao adicionar aporte na meta.');
    }
  };

  return (
    <div className="clar-page">
      <header className="clar-page-header">
        <div>
          <h1>Planejamento Financeiro</h1>
          <p>Defina suas metas com base na regra personalizada.</p>
        </div>
        <button type="button" className="clar-primary-btn" onClick={() => setShowGoalModal(true)}>
          <Plus size={16} />
          Nova Meta
        </button>
      </header>

      <section className="clar-two-cols planning">
        <div className="clar-card">
          <h2>Distribuição de Renda</h2>
          {planningLoading ? (
            <div className="clar-planning-skeleton">
              <span className="clar-skeleton-line" style={{ width: '100%', height: 42 }} />
              <span className="clar-skeleton-line" style={{ width: '94%', height: 10 }} />
              <span className="clar-skeleton-line" style={{ width: '100%', height: 42 }} />
              <span className="clar-skeleton-line" style={{ width: '91%', height: 10 }} />
              <span className="clar-skeleton-line" style={{ width: '100%', height: 42 }} />
              <span className="clar-skeleton-line" style={{ width: '88%', height: 10 }} />
            </div>
          ) : (
            <>
              <div className="clar-plan-row">
                <div>
                  <strong>Necessidades</strong>
                  <p>Aluguel, contas, alimentação básica, saúde.</p>
                </div>
                <div className="clar-plan-right">
                  <span>{form.percent_needs}%</span>
                  <strong>{formatBRL(distribution.needs)}</strong>
                </div>
              </div>
              <div className="clar-progress-track"><div style={{ width: `${form.percent_needs}%` }} /></div>

              <div className="clar-plan-row">
                <div>
                  <strong>Desejos</strong>
                  <p>Lazer, hobbies, assinaturas.</p>
                </div>
                <div className="clar-plan-right amber">
                  <span>{form.percent_wants}%</span>
                  <strong>{formatBRL(distribution.wants)}</strong>
                </div>
              </div>
              <div className="clar-progress-track amber"><div style={{ width: `${form.percent_wants}%` }} /></div>

              <div className="clar-plan-row">
                <div>
                  <strong>Dívidas e Investimentos</strong>
                  <p>Reserva, aposentadoria e quitação.</p>
                </div>
                <div className="clar-plan-right green">
                  <span>{form.percent_investments}%</span>
                  <strong>{formatBRL(distribution.investments)}</strong>
                </div>
              </div>
              <div className="clar-progress-track green"><div style={{ width: `${form.percent_investments}%` }} /></div>
            </>
          )}
        </div>

        <div className="clar-col-stack">
          <div className="clar-card clar-tip-card">
            <h3>O que é 50/30/20?</h3>
            <p>
              Método de orçamento que divide a renda em necessidades, desejos e investimentos.
              No seu sistema, os percentuais podem ser personalizados.
            </p>
          </div>

          <div className="clar-card">
            <div className="clar-card-head">
              <h3>Configurações</h3>
              <button type="button" className="clar-icon-btn" onClick={() => setEditing((v) => !v)}>
                <Pencil size={14} />
              </button>
            </div>

            <div className="clar-form-grid one">
              <label>Renda Mensal Líquida
                <input
                  type="number"
                  value={form.base_income}
                  onChange={(e) => setForm((prev) => ({ ...prev, base_income: e.target.value }))}
                  disabled={planningLoading || !editing}
                />
              </label>
            </div>

            <div className="clar-form-grid three">
              <label>Nec.
                <input
                  type="number"
                  value={form.percent_needs}
                  onChange={(e) => setForm((prev) => ({ ...prev, percent_needs: e.target.value }))}
                  disabled={planningLoading || !editing}
                />
              </label>
              <label>Des.
                <input
                  type="number"
                  value={form.percent_wants}
                  onChange={(e) => setForm((prev) => ({ ...prev, percent_wants: e.target.value }))}
                  disabled={planningLoading || !editing}
                />
              </label>
              <label>Inv.
                <input
                  type="number"
                  value={form.percent_investments}
                  onChange={(e) => setForm((prev) => ({ ...prev, percent_investments: e.target.value }))}
                  disabled={planningLoading || !editing}
                />
              </label>
            </div>

            {editing && !planningLoading && (
              <button type="button" className="clar-primary-btn full" onClick={saveConfig}>
                Salvar Alterações
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="clar-card">
        <h2>Metas de Curto Prazo</h2>
        <div className="clar-goals-list">
          {planningLoading ? (
            <div className="clar-planning-goals-skeleton">
              <span className="clar-skeleton-line" style={{ width: '100%', height: 56 }} />
              <span className="clar-skeleton-line" style={{ width: '100%', height: 56 }} />
              <span className="clar-skeleton-line" style={{ width: '100%', height: 56 }} />
            </div>
          ) : goals.length === 0 ? (
            <p className="clar-empty">Nenhuma meta cadastrada ainda.</p>
          ) : (
            goals.map((goal) => {
              const progress = Math.min((Number(goal.current_amount || 0) / (Number(goal.target_amount || 1))) * 100, 100);

              return (
                <div key={goal.id} className="clar-goal-item">
                  <div className="clar-goal-head">
                    <strong>{goal.title}</strong>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="clar-progress-track"><div style={{ width: `${progress}%` }} /></div>
                  <div className="clar-goal-foot">
                    <small>{formatBRL(goal.current_amount)}</small>
                    <small>Meta: {formatBRL(goal.target_amount)}</small>
                  </div>
                  <div className="clar-goal-actions">
                    <button type="button" className="clar-secondary-btn" onClick={() => openContributionModal(goal)}>
                      Fazer Aporte
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {showGoalModal && (
        <div className="clar-modal-backdrop" onClick={() => setShowGoalModal(false)}>
          <div className="clar-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="clar-modal-head">
              <h3>Nova Meta de Curto Prazo</h3>
              <button type="button" className="clar-icon-btn" onClick={() => setShowGoalModal(false)}>✕</button>
            </div>

            <div className="clar-form-grid one">
              <label>Título da meta
                <input value={newGoal.title} onChange={(e) => setNewGoal((prev) => ({ ...prev, title: e.target.value }))} />
              </label>
              <label>Valor alvo (R$)
                <input type="number" value={newGoal.target_amount} onChange={(e) => setNewGoal((prev) => ({ ...prev, target_amount: e.target.value }))} />
              </label>
              <label>Valor atual (R$)
                <input type="number" value={newGoal.current_amount} onChange={(e) => setNewGoal((prev) => ({ ...prev, current_amount: e.target.value }))} />
              </label>
            </div>

            <div className="clar-modal-actions">
              <button type="button" className="clar-secondary-btn" onClick={() => setShowGoalModal(false)}>Cancelar</button>
              <button type="button" className="clar-primary-btn" onClick={createGoal}>Salvar Meta</button>
            </div>
          </div>
        </div>
      )}

      {showContributionModal && (
        <div className="clar-modal-backdrop" onClick={() => setShowContributionModal(false)}>
          <div className="clar-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="clar-modal-head">
              <h3>Adicionar valor na meta</h3>
              <button type="button" className="clar-icon-btn" onClick={() => setShowContributionModal(false)}>✕</button>
            </div>

            <div className="clar-form-grid one">
              <label>Meta selecionada
                <input value={selectedGoal?.title || ''} disabled />
              </label>

              <label>Aporte (R$)
                <input
                  type="number"
                  step="0.01"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  autoFocus
                />
              </label>
            </div>

            <div className="clar-modal-actions">
              <button type="button" className="clar-secondary-btn" onClick={() => setShowContributionModal(false)}>Cancelar</button>
              <button type="button" className="clar-primary-btn" onClick={addContributionToGoal}>Confirmar aporte</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
