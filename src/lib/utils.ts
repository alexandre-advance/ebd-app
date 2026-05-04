import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma string de data (YYYY-MM-DD ou ISO) para o padrão brasileiro local,
 * evitando o erro de atraso de um dia causado pelo fuso horário UTC.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  // Se a string for apenas YYYY-MM-DD, anexamos o horário para tratar como local
  // ou lidamos com o split para garantir que não haja deslocamento.
  if (dateString.includes('-') && !dateString.includes('T')) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
  }

  // Para ISO completo ou outros formatos
  return new Date(dateString).toLocaleDateString('pt-BR');
}

/**
 * Retorna apenas o dia e mês formatados (DD/MM)
 */
export function formatDayMonth(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  if (dateString.includes('-') && !dateString.includes('T')) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Converte uma string de data YYYY-MM-DD para um objeto Date local,
 * evitando deslocamentos de fuso horário.
 */
export function parseLocalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  if (dateString.includes('-') && !dateString.includes('T')) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0); // Meio-dia para evitar problemas de borda
  }
  return new Date(dateString);
}
