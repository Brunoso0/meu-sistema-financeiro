import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Tag } from 'lucide-react';
import { toast } from 'react-toastify';

const PLANNING_GROUP_OPTIONS = {
  expense: [
    { value: 'needs', label: 'Necessidades' },
    { value: 'wants', label: 'Desejos' },
    { value: 'investments', label: 'Investimentos' },
  ],
  income: [
    { value: 'none', label: 'Receita geral' },
    { value: 'investments', label: 'Aporte / retorno de investimento' },
  ],
};

export default function CategorySelectField({
  label = 'Categoria',
  transactionType,
  value,
  onChange,
  categories,
  onCreateCategory,
  disabled = false,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftGroup, setDraftGroup] = useState(transactionType === 'expense' ? 'wants' : 'none');
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef(null);

  const options = useMemo(
    () => categories.filter((category) => category.type === transactionType),
    [categories, transactionType],
  );

  const globalOptions = useMemo(
    () => options.filter((category) => Boolean(category.is_global)),
    [options],
  );

  const privateOptions = useMemo(
    () => options.filter((category) => !category.is_global),
    [options],
  );

  useEffect(() => {
    setDraftGroup(transactionType === 'expense' ? 'wants' : 'none');
  }, [transactionType]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCategory = (categoryName) => {
    onChange(categoryName);
    setIsDropdownOpen(false);
  };

  const handleCreate = async () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      toast.error('Informe o nome da categoria.');
      return;
    }

    setIsSaving(true);

    try {
      const created = await onCreateCategory({
        name: trimmedName,
        type: transactionType,
        planningGroup: draftGroup === 'none' ? null : draftGroup,
      });

      onChange(created.name);
      setDraftName('');
      setIsCreating(false);
      toast.success('Categoria criada com sucesso.');
    } catch (error) {
      if (error?.code === '23505') {
        toast.error('Já existe uma categoria com esse nome para este tipo.');
      } else {
        toast.error(error?.message || 'Erro ao criar categoria.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="clar-category-field">
      <span className="clar-category-label">{label}</span>

      <div className="clar-category-dropdown" ref={dropdownRef}>
        <button
          type="button"
          className={`clar-category-dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
          onClick={() => setIsDropdownOpen((open) => !open)}
          disabled={disabled || options.length === 0}
          aria-expanded={isDropdownOpen}
        >
          <span className="clar-category-dropdown-value">{value || 'Selecione a categoria'}</span>
          <ChevronDown size={16} />
        </button>

        {isDropdownOpen && options.length > 0 && (
          <div className="clar-category-dropdown-menu">
            {globalOptions.length > 0 && (
              <div className="clar-category-dropdown-group">
                <small>Globais</small>
                {globalOptions.map((category) => (
                  <button
                    key={`${category.type}-${category.id}`}
                    type="button"
                    className={`clar-category-option ${value === category.name ? 'active' : ''}`}
                    onClick={() => handleSelectCategory(category.name)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            {privateOptions.length > 0 && (
              <div className="clar-category-dropdown-group">
                <small>Minhas categorias</small>
                {privateOptions.map((category) => (
                  <button
                    key={`${category.type}-${category.id}`}
                    type="button"
                    className={`clar-category-option ${value === category.name ? 'active' : ''}`}
                    onClick={() => handleSelectCategory(category.name)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="clar-category-row">
        <button
          type="button"
          className={`clar-secondary-btn clar-category-add-btn ${isCreating ? 'active' : ''}`}
          onClick={() => setIsCreating((current) => !current)}
          disabled={disabled && !isCreating}
          aria-expanded={isCreating}
        >
          <Plus size={14} />
          {isCreating ? 'Fechar criação' : 'Nova categoria'}
          {isCreating ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <small className="clar-category-hint">
        <Tag size={13} />
        Selecione uma categoria existente ou crie uma nova.
      </small>

      {options.length === 0 && (
        <small className="clar-category-hint">
          <Tag size={13} />
          Nenhuma categoria disponível para este tipo.
        </small>
      )}

      {isCreating && (
        <div className="clar-category-create-box">
          <label>
            <span>Nome da nova categoria</span>
            <input
              value={draftName}
              placeholder={transactionType === 'income' ? 'Ex.: Freelance' : 'Ex.: Pets'}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </label>

          <label>
            <span>{transactionType === 'expense' ? 'Classificação no 50/30/20' : 'Impacto no planejamento'}</span>
            <select value={draftGroup} onChange={(event) => setDraftGroup(event.target.value)}>
              {PLANNING_GROUP_OPTIONS[transactionType].map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <div className="clar-category-create-actions">
            <button type="button" className="clar-secondary-btn" onClick={() => setIsCreating(false)} disabled={isSaving}>
              Cancelar
            </button>
            <button type="button" className="clar-primary-btn" onClick={handleCreate} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar categoria'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}