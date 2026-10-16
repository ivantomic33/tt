/**
 * Centralizovana lista administratorskih email adresa na klijentu.
 *
 * VAŽNO: Ovo je isključivo UI hint (prikaz admin interfejsa). Stvarna autorizacija
 * se uvek vrši na serveru (JWT role + baza). Lista se učitava iz okruženja
 * (VITE_ADMIN_EMAILS) — nema hardkodovanih ličnih adresa u izvornom kodu.
 */

const RAW = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ADMIN_EMAILS) ||
  (typeof process !== 'undefined' ? process.env?.VITE_ADMIN_EMAILS : '') ||
  ''
) as string;

export const CONFIGURED_ADMIN_EMAILS = new Set(
  RAW.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function isConfiguredAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return CONFIGURED_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
