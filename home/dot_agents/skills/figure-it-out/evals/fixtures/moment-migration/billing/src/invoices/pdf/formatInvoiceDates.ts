import moment from 'moment';
import 'moment-timezone';

import type { Invoice } from '../types';

// Strings returned here are drawn straight into the PDF by pdfkit.
// Customers reconcile against archived PDFs, so changing a single character
// (padding, ordinal suffix, timezone abbreviation) opens a support ticket.

export function headerDates(inv: Invoice) {
  moment.locale(inv.account.locale);
  return {
    issued: moment(inv.issuedAt).format('MMM Do, YYYY'),
    due: moment(inv.dueAt).format('L'),
    period: moment(inv.periodStart).format('MMMM YYYY'),
  };
}

export function summaryBlock(inv: Invoice) {
  return {
    issuedOn: moment(inv.issuedAt).format('MMM Do, YYYY'),
    billingPeriod: moment(inv.periodStart).format('MMMM YYYY'),
  };
}

export function remittanceStub(inv: Invoice) {
  return {
    payBy: moment(inv.dueAt).format('L'),
    reference: `${inv.number} / ${moment(inv.issuedAt).format('MMM Do, YYYY')}`,
  };
}

export function generatedLine(inv: Invoice) {
  const tz = inv.account.timezone;
  return `Generated ${moment.tz(inv.issuedAt, tz).format('YYYY-MM-DD HH:mm z')}`;
}

export function auditStamp(inv: Invoice) {
  return moment.tz(inv.issuedAt, inv.account.timezone).format('YYYY-MM-DD HH:mm z');
}
