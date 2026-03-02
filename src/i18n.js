import en from './i18n/en.json';
import es from './i18n/es.json';

const locales = { en, es };
let currentLang = 'en';

function detectLang() {
  const stored = localStorage.getItem('whisper-pwa-lang');
  if (stored && locales[stored]) return stored;
  const nav = (navigator.language || '').slice(0, 2).toLowerCase();
  return locales[nav] ? nav : 'en';
}

export function t(key) {
  return locales[currentLang]?.[key] ?? locales.en[key] ?? key;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!locales[lang]) return;
  currentLang = lang;
  localStorage.setItem('whisper-pwa-lang', lang);
  renderI18n();
}

export function renderI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  document.documentElement.lang = currentLang;
}

export function initI18n() {
  currentLang = detectLang();
  renderI18n();
}
