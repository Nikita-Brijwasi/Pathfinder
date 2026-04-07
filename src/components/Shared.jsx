import React, { useState } from 'react';
import { getLocalDateString } from '../utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ProgressRing = ({ progress, size = 80, strokeWidth = 8, color = "var(--accent)" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - ((progress || 0) / 100) * circumference;
  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg className="progress-ring-svg" width={size} height={size}>
        <circle className="progress-ring-bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle className="progress-ring-path" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} style={{ stroke: color }} />
      </svg>
      <span className="progress-ring-text">{Math.round(progress || 0)}%</span>
    </div>
  );
};

export const ActivityCalendar = ({ history }) => {
  // Use state to track the currently viewed month
  const [displayDate, setDisplayDate] = useState(new Date());
  
  const currentMonth = displayDate.getMonth();
  const currentYear = displayDate.getFullYear();

  // Find the first and last day of the currently viewed month
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  // 0 (Sunday) to 6 (Saturday)
  const startDayOfWeek = startOfMonth.getDay(); 
  const endDayOfWeek = endOfMonth.getDay();

  const days = [];

  // 1. Pad days from the previous month to fill the first week
  for (let i = startDayOfWeek; i > 0; i--) {
    const d = new Date(currentYear, currentMonth, 1 - i);
    days.push({ date: getLocalDateString(d), label: d.getDate(), isCurrentMonth: false });
  }

  // 2. Add actual days of the current month
  for (let i = 1; i <= endOfMonth.getDate(); i++) {
    const d = new Date(currentYear, currentMonth, i);
    days.push({ date: getLocalDateString(d), label: i, isCurrentMonth: true });
  }

  // 3. Pad days from the next month to fill the last week
  const daysToAddAtEnd = 6 - endDayOfWeek;
  for (let i = 1; i <= daysToAddAtEnd; i++) {
    const d = new Date(currentYear, currentMonth + 1, i);
    days.push({ date: getLocalDateString(d), label: i, isCurrentMonth: false });
  }

  const handlePrevMonth = () => {
    setDisplayDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayDate(new Date(currentYear, currentMonth + 1, 1));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 'bold' }}>
         <button onClick={handlePrevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
           <ChevronLeft size={18} />
         </button>
         <span>{displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
         <button onClick={handleNextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
           <ChevronRight size={18} />
         </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={`header-${i}`} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{day}</div>
        ))}
        {days.map(d => {
          const count = history[d.date] || 0;
          let bg = 'var(--bg-dark)';
          let border = '1px solid var(--border)';
          let color = d.isCurrentMonth ? 'var(--text-muted)' : 'rgba(203, 213, 225, 0.25)'; 
          
          if (count > 0) {
            bg = count > 1 ? 'var(--accent)' : 'var(--primary)';
            border = 'none';
            color = '#fff';
          }
          
          return (
            <div key={d.date} style={{ 
              aspectRatio: '1', backgroundColor: bg, border, borderRadius: '4px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '0.75rem', color, fontWeight: '500'
            }} title={`${d.date}: ${count} actions completed`}>
              {d.label}
            </div>
          )
        })}
      </div>
    </div>
  )
};