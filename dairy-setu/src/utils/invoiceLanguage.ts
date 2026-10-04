export type InvoiceLanguage = 'hinglish' | 'english' | 'hindi';

const KEY = 'app-language';

export function getInvoiceLanguage(): InvoiceLanguage {
  const saved = localStorage.getItem(KEY);
  if (saved === 'hindi') return 'hindi';
  return 'english';
}

export function setInvoiceLanguage(language: InvoiceLanguage) {
  localStorage.setItem(KEY, language === 'hindi' ? 'hindi' : 'english');
}
