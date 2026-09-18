import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

/** Chart.js modular components registration. */
ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip);

/** Chart color palette aligned with theme tokens. */
export const CHART_COLORS = {
  primary: '#8b5cf6',
  accent: '#3b82f6',
  pink: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  dangerous: '#b91c1c',
  textSecondary: '#a1a1aa',
  border: 'rgba(255, 255, 255, 0.08)',
} as const;

export const DIALECT_COLORS: Record<string, string> = {
  postgresql: CHART_COLORS.accent,
  mysql: CHART_COLORS.warning,
  mariadb: '#f97316',
  sqlite: CHART_COLORS.success,
  libsql: CHART_COLORS.pink,
  mssql: CHART_COLORS.primary,
};
