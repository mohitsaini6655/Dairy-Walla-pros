import type { BusinessLine, DistributorType } from '../types';

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const iceCreamKeywords = [
  'icecream',
  'ice cream',
  'kulfi',
  'cone',
  'cup',
  'bar',
  'candy',
  'sundae',
  'gelato',
  'scoop',
  'frozen dessert',
];

const dairyKeywords = [
  'milk',
  'paneer',
  'curd',
  'dahi',
  'butter',
  'ghee',
  'cheese',
  'lassi',
  'chaas',
  'yogurt',
  'yoghurt',
  'cream',
];

export const dairyCategoryOptions = ['milk', 'paneer', 'curd', 'butter', 'ghee', 'cheese', 'other'] as const;
export const iceCreamCategoryOptions = ['ice cream', 'kulfi', 'cone', 'cup', 'bar', 'family pack', 'other'] as const;
const categoryEmojiMap: Record<string, string> = {
  milk: '🥛',
  paneer: '🧀',
  curd: '🥣',
  dahi: '🥣',
  butter: '🧈',
  ghee: '🫙',
  cheese: '🧀',
  lassi: '🥤',
  chaas: '🥤',
  yogurt: '🥣',
  yoghurt: '🥣',
  cream: '🥛',
  'ice cream': '🍦',
  icecream: '🍦',
  kulfi: '🍨',
  cone: '🍦',
  cup: '🍨',
  bar: '🍫',
  'family pack': '🍨',
  other: '📦',
};

export function normalizeCategoryName(value: string) {
  return normalize(value || 'other') || 'other';
}

export function getCategoryEmoji(category: string) {
  const normalized = normalizeCategoryName(category);
  return categoryEmojiMap[normalized] || '📦';
}

export function getProductQuantityText(quantity?: string | null, fallback?: string | null) {
  const resolved = String(quantity ?? fallback ?? '').trim();
  return resolved || '-';
}

export function toDistributorType(value: unknown): DistributorType {
  if (value === 'icecream') return 'icecream';
  if (value === 'dual') return 'dual';
  return 'dairy';
}

export function inferBusinessLineFromCategory(category: string, provided?: string): BusinessLine {
  if (provided === 'icecream') return 'icecream';
  if (provided === 'dairy') return 'dairy';
  const normalized = normalizeCategoryName(category);
  if (iceCreamKeywords.some(keyword => normalized.includes(keyword))) return 'icecream';
  if (dairyKeywords.some(keyword => normalized.includes(keyword))) return 'dairy';
  return 'dairy';
}

export function getAllowedBusinessLines(distributorType: DistributorType): BusinessLine[] {
  if (distributorType === 'dual') return ['dairy', 'icecream'];
  return [distributorType === 'icecream' ? 'icecream' : 'dairy'];
}

export function businessLineLabel(line: BusinessLine) {
  return line === 'icecream' ? 'Ice Cream' : 'Dairy Products';
}

export function distributorTypeLabel(type: DistributorType) {
  if (type === 'dual') return 'Dairy + Ice Cream';
  if (type === 'icecream') return 'Ice Cream';
  return 'Dairy Products';
}
