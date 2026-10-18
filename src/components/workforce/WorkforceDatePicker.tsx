import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';

interface WorkforceDatePickerProps {
  value: string; // ISO format 'YYYY-MM-DD'
  onChange: (newDateISO: string) => void;
  className?: string;
}

// Convert YYYY-MM-DD to Australian format DD/MM/YYYY
export function formatAUDate(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

// Parse user entered string (DD/MM/YYYY or YYYY-MM-DD) into YYYY-MM-DD
export function parseAUDate(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const slashParts = trimmed.split(/[\/\-\.]/);
  if (slashParts.length === 3) {
    let [d, m, y] = slashParts;
    // Check if YYYY-MM-DD was entered
    if (d.length === 4 && y.length <= 2) {
      const temp = d;
      d = y;
      y = temp;
    }
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    let year = parseInt(y, 10);
    if (year < 100) year += 2000;

    if (
      !isNaN(day) &&
      !isNaN(month) &&
      !isNaN(year) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      year >= 2000 &&
      year <= 2100
    ) {
      // Validate days in month
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day <= daysInMonth) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

// Step date forward or backward by N days
export function adjustDateDays(isoStr: string, offsetDays: number): string {
  if (!isoStr) return getTodayISO();
  const [y, m, d] = isoStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + offsetDays);

  const ny = dateObj.getFullYear();
  const nm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const nd = String(dateObj.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

// Get local project/user today date in YYYY-MM-DD
export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const WorkforceDatePicker: React.FC<WorkforceDatePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState<string>(formatAUDate(value));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [navYear, setNavYear] = useState<number>(2026);
  const [navMonth, setNavMonth] = useState<number>(9); // 0-indexed, 9 = October

  const containerRef = useRef<HTMLDivElement>(null);
  const nativeDateRef = useRef<HTMLInputElement>(null);

  // Sync internal display when external value changes
  useEffect(() => {
    setInputValue(formatAUDate(value));
    if (value) {
      const [y, m] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setNavYear(y);
        setNavMonth(m - 1);
      }
    }
  }, [value]);

  // Handle click outside to close calendar popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePreviousDay = () => {
    const prev = adjustDateDays(value, -1);
    onChange(prev);
  };

  const handleNextDay = () => {
    const next = adjustDateDays(value, 1);
    onChange(next);
  };

  const handleTodayClick = () => {
    const today = getTodayISO();
    onChange(today);
    setIsCalendarOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseAUDate(raw);
    if (parsed && parsed !== value) {
      onChange(parsed);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseAUDate(inputValue);
    if (parsed) {
      onChange(parsed);
      setInputValue(formatAUDate(parsed));
    } else {
      // Revert to current valid value
      setInputValue(formatAUDate(value));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      setIsCalendarOpen(false);
    } else if (e.key === 'Escape') {
      setIsCalendarOpen(false);
      setInputValue(formatAUDate(value));
    }
  };

  const openCalendar = () => {
    setIsCalendarOpen((prev) => !prev);
    // Also try to trigger native picker if browser supports it
    if (nativeDateRef.current && typeof nativeDateRef.current.showPicker === 'function') {
      try {
        nativeDateRef.current.showPicker();
      } catch (err) {
        // Fallback gracefully to custom React popover
      }
    }
  };

  // Mini-calendar generation
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysInCurrentMonth = new Date(navYear, navMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(navYear, navMonth, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear((y) => y - 1);
    } else {
      setNavMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear((y) => y + 1);
    } else {
      setNavMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const selected = `${navYear}-${String(navMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    onChange(selected);
    setIsCalendarOpen(false);
  };

  const todayISO = getTodayISO();
  const isTodaySelected = value === todayISO;

  return (
    <div ref={containerRef} className={`relative flex items-center gap-1.5 ${className}`}>
      {/* 1. PREVIOUS DAY CHEVRON */}
      <button
        type="button"
        onClick={handlePreviousDay}
        title="Previous Day (←)"
        className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all shadow-inner"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* 2. DATE SELECTOR INPUT CONTAINER */}
      <div
        className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 hover:border-amber-500/60 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 rounded-xl px-3 py-1.5 shadow-inner transition-all cursor-pointer"
        onClick={(e) => {
          // If clicking background or calendar icon, toggle calendar
          if ((e.target as HTMLElement).tagName !== 'INPUT') {
            openCalendar();
          }
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openCalendar();
          }}
          title="Open Calendar Date Picker"
          className="text-amber-400 hover:text-amber-300 focus:outline-none transition-transform hover:scale-110 active:scale-95"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>

        {/* Formatted Text Input for Australian DD/MM/YYYY */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onClick={() => {
            // Clicking inside opens the calendar popup if not open
            if (!isCalendarOpen) setIsCalendarOpen(true);
          }}
          placeholder="DD/MM/YYYY"
          title="Click to open calendar or type date (DD/MM/YYYY)"
          className="bg-transparent text-xs font-bold text-white tracking-wider w-24 focus:outline-none cursor-pointer"
        />

        {/* Hidden native date input for browser showPicker fallback */}
        <input
          ref={nativeDateRef}
          type="date"
          value={value}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
              setIsCalendarOpen(false);
            }
          }}
          className="sr-only pointer-events-none opacity-0 absolute w-0 h-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* 3. NEXT DAY CHEVRON */}
      <button
        type="button"
        onClick={handleNextDay}
        title="Next Day (→)"
        className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all shadow-inner"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* 4. TODAY BUTTON */}
      <button
        type="button"
        onClick={handleTodayClick}
        title="Jump to Today's Date"
        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-sm active:scale-95 ${
          isTodaySelected
            ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400'
            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white'
        }`}
      >
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span>TODAY</span>
      </button>

      {/* 5. INTERACTIVE CALENDAR DROPDOWN POPOVER */}
      {isCalendarOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 text-white animate-in fade-in zoom-in-95 duration-150">
          {/* Header: Month & Year navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-bold text-xs tracking-wide text-amber-400">
              {monthNames[navMonth]} {navYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span className="text-amber-500/80">Sa</span>
            <span className="text-amber-500/80">Su</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`blank-${i}`} className="p-1.5" />
            ))}

            {/* Day buttons */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${navYear}-${String(navMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayISO;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`p-1.5 rounded-lg font-mono text-xs transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md scale-105'
                      : isToday
                      ? 'border border-amber-500/60 text-amber-300 font-bold hover:bg-slate-800'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer with Today Jump & Close */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleTodayClick}
              className="text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center space-x-1"
            >
              <span>Today ({formatAUDate(todayISO)})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 text-[11px]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
