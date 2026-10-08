import { addDays } from 'datekit';

export function dueDate(issued: Date, termsDays: number): Date {
  return addDays(issued, termsDays);
}
