import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import '../styles/datepicker.css';

export default function DatePicker({ value, onChange, label, required }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMonthYear, setShowMonthYear] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currentDate, setCurrentDate] = useState(
    value ? new Date(value + 'T12:00:00') : new Date()
  );
  const calendarRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
        setShowMonthYear(false);
      }
    }

    if (showCalendar || showMonthYear) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendar, showMonthYear]);

  useEffect(() => {
    setInputValue(formatDate(value));
  }, [value]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const parseDate = (dateStr) => {
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handlePrevYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth()));
  };

  const handleSelectDay = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = newDate.toISOString().split('T')[0];
    onChange({ target: { value: dateStr } });
    setShowCalendar(false);
    setShowMonthYear(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    const date = parseDate(val);
    if (date && val.length === 10) {
      const dateStr = date.toISOString().split('T')[0];
      onChange({ target: { value: dateStr } });
      setCurrentDate(date);
      setShowCalendar(false);
    }
  };

  const handleQuickDate = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const dateStr = date.toISOString().split('T')[0];
    onChange({ target: { value: dateStr } });
    setCurrentDate(date);
    setShowCalendar(false);
  };

  const handleClear = () => {
    onChange({ target: { value: '' } });
    setInputValue('');
  };

  const days = generateCalendarDays();
  const monthYear = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const selectedDay = value ? parseInt(value.split('-')[2]) : null;
  const selectedMonth = value ? parseInt(value.split('-')[1]) : null;
  const selectedYear = value ? parseInt(value.split('-')[0]) : null;

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  return (
    <label className="datepicker-label">
      {label}
      <div className="datepicker-input-wrapper" ref={calendarRef}>
        <div className="datepicker-input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            placeholder="DD/MM/YYYY"
            onChange={handleInputChange}
            onFocus={() => setShowCalendar(true)}
            required={required}
            className="datepicker-text-input"
            maxLength="10"
          />
          {value && (
            <button
              type="button"
              className="datepicker-clear-btn"
              onClick={handleClear}
              title="Limpar data"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            className="datepicker-toggle-btn"
            onClick={() => setShowCalendar(!showCalendar)}
            title="Abrir calendário"
          >
            <Calendar size={18} />
          </button>
        </div>

        {showCalendar && (
          <div className="datepicker-calendar">
            <div className={`datepicker-header ${showMonthYear ? 'hidden' : ''}`}>
              <button
                type="button"
                className="datepicker-nav-btn"
                onClick={handlePrevMonth}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="datepicker-month-year-btn"
                onClick={() => setShowMonthYear(true)}
              >
                {monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}
              </button>
              <button
                type="button"
                className="datepicker-nav-btn"
                onClick={handleNextMonth}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {showMonthYear && (
              <div className="datepicker-month-year-selector">
                <div className="datepicker-selector-section">
                  <div className="datepicker-selector-title">Mês</div>
                  <div className="datepicker-months-grid">
                    {months.map((month, idx) => (
                      <button
                        key={month}
                        type="button"
                        className={`datepicker-month-btn ${
                          idx === currentDate.getMonth() ? 'active' : ''
                        }`}
                        onClick={() => {
                          setCurrentDate(new Date(currentDate.getFullYear(), idx));
                          setShowMonthYear(false);
                        }}
                      >
                        {month.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="datepicker-selector-divider"></div>
                <div className="datepicker-selector-section">
                  <div className="datepicker-selector-title">Ano</div>
                  <button
                    type="button"
                    className="datepicker-nav-btn"
                    onClick={handlePrevYear}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="datepicker-years-grid">
                    {years.map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={`datepicker-year-btn ${
                          year === currentDate.getFullYear() ? 'active' : ''
                        }`}
                        onClick={() => {
                          setCurrentDate(new Date(year, currentDate.getMonth()));
                          setShowMonthYear(false);
                        }}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="datepicker-nav-btn"
                    onClick={handleNextYear}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {!showMonthYear && (
              <>
                <div className="datepicker-weekdays">
                  <div className="datepicker-weekday">Dom</div>
                  <div className="datepicker-weekday">Seg</div>
                  <div className="datepicker-weekday">Ter</div>
                  <div className="datepicker-weekday">Qua</div>
                  <div className="datepicker-weekday">Qui</div>
                  <div className="datepicker-weekday">Sex</div>
                  <div className="datepicker-weekday">Sab</div>
                </div>

                <div className="datepicker-days">
                  {days.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`datepicker-day ${!day ? 'empty' : ''} ${
                        day &&
                        day === selectedDay &&
                        currentDate.getMonth() === selectedMonth - 1 &&
                        currentDate.getFullYear() === selectedYear
                          ? 'selected'
                          : ''
                      } ${day && isToday(day) ? 'today' : ''}`}
                      onClick={() => day && handleSelectDay(day)}
                      disabled={!day}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </label>
  );
}
