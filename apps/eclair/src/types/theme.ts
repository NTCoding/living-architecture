export type Theme = 'stream' | 'voltage' | 'circuit';

export const THEMES: readonly Theme[] = ['stream', 'voltage', 'circuit'];

export const THEME_LABELS: Record<Theme, string> = {
  stream: 'Stream',
  voltage: 'Voltage',
  circuit: 'Circuit',
};

export const DEFAULT_THEME: Theme = 'stream';
export const THEME_STORAGE_KEY = 'eclair-theme';
