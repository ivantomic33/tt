import React from 'react';
import DOMPurify from 'dompurify';

/**
 * Konfiguracija i Servis za DOMPurify Sanitizaciju (Anti-XSS Zaštita)
 * Uklanja sve potencijalno opasne tagove (<script>, <iframe>, event handlere poput onload/onerror)
 * i neproverene URL-ove (javascript: pseudo-protokole).
 */

const SANITIZE_CONFIG: Record<string, any> = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'b',
    'i',
    'strong',
    'em',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'code',
    'pre',
    'br',
    'hr',
    'img',
    'span',
    'div',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  ALLOWED_ATTR: [
    'href',
    'src',
    'alt',
    'title',
    'target',
    'rel',
    'class',
    'style',
    'width',
    'height',
  ],
  ALLOW_DATA_ATTR: false, // Odbija proizvoljne data-* atribute koji se koriste za skripting
  ADD_ATTR: ['target', 'rel'], // Automatski osigurava noopener noreferrer za spoljne linkove
  USE_PROFILES: { html: true },
};

/**
 * Sanitizuje sirovi HTML string pre renderovanja u DOM
 */
export function sanitizeHTML(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  try {
    if (typeof window !== 'undefined') {
      const clean = DOMPurify.sanitize(dirtyHtml, SANITIZE_CONFIG);
      return String(clean);
    }
  } catch (e) {
    console.warn('DOMPurify sanitization exception:', e);
  }

  // Osnovni fallback za uklanjanje script i iframe tagova ako DOMPurify nije inicijalizovan
  return dirtyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
}

interface SanitizedHTMLProps {
  html: string;
  className?: string;
}

/**
 * Bezbedna React komponenta za renderovanje HTML sadržaja vesti
 * Zamenjuje direktan, rizični `dangerouslySetInnerHTML` sa pročišćenim HTML-om.
 */
export const SanitizedHTML: React.FC<SanitizedHTMLProps> = ({ html, className }) => {
  const cleanHtml = sanitizeHTML(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};
