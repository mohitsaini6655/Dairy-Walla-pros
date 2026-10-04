import type { OrderItem } from '../types';

type ParsedPackSize = {
  value: number;
  unit: string;
  family: 'volume' | 'weight' | 'count' | 'custom' | 'number';
  baseValue: number;
};

const unitAliases: Record<string, { unit: string; family: ParsedPackSize['family']; factor: number }> = {
  ml: { unit: 'ml', family: 'volume', factor: 1 },
  milliliter: { unit: 'ml', family: 'volume', factor: 1 },
  millilitre: { unit: 'ml', family: 'volume', factor: 1 },
  l: { unit: 'L', family: 'volume', factor: 1000 },
  lt: { unit: 'L', family: 'volume', factor: 1000 },
  ltr: { unit: 'L', family: 'volume', factor: 1000 },
  liter: { unit: 'L', family: 'volume', factor: 1000 },
  litre: { unit: 'L', family: 'volume', factor: 1000 },
  g: { unit: 'g', family: 'weight', factor: 1 },
  gm: { unit: 'g', family: 'weight', factor: 1 },
  gram: { unit: 'g', family: 'weight', factor: 1 },
  kg: { unit: 'kg', family: 'weight', factor: 1000 },
  kilogram: { unit: 'kg', family: 'weight', factor: 1000 },
  pc: { unit: 'pcs', family: 'count', factor: 1 },
  pcs: { unit: 'pcs', family: 'count', factor: 1 },
  piece: { unit: 'pcs', family: 'count', factor: 1 },
  pieces: { unit: 'pcs', family: 'count', factor: 1 },
  packet: { unit: 'packet', family: 'count', factor: 1 },
  packets: { unit: 'packet', family: 'count', factor: 1 },
  pack: { unit: 'pack', family: 'count', factor: 1 },
  packs: { unit: 'pack', family: 'count', factor: 1 },
  crate: { unit: 'crate', family: 'count', factor: 1 },
  crates: { unit: 'crate', family: 'count', factor: 1 },
  box: { unit: 'box', family: 'count', factor: 1 },
  boxes: { unit: 'box', family: 'count', factor: 1 },
};

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toLocaleString();
}

function parsePackSize(packSize?: string | null): ParsedPackSize | null {
  const trimmed = String(packSize ?? '').trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  const rawUnit = (match[2] || '').toLowerCase();
  if (!rawUnit) {
    return { value, unit: '', family: 'number', baseValue: value };
  }

  const alias = unitAliases[rawUnit] || { unit: rawUnit, family: 'custom' as const, factor: 1 };
  return {
    value,
    unit: alias.unit,
    family: alias.family,
    baseValue: value * alias.factor,
  };
}

function formatBaseQuantity(value: number, family: ParsedPackSize['family'], unit: string) {
  if (family === 'volume') {
    if (value >= 1000) return `${formatNumber(value / 1000)} L`;
    return `${formatNumber(value)} ml`;
  }

  if (family === 'weight') {
    if (value >= 1000) return `${formatNumber(value / 1000)} kg`;
    return `${formatNumber(value)} g`;
  }

  if (family === 'number') return formatNumber(value);
  return `${formatNumber(value)} ${unit}`.trim();
}

export function formatPackSize(packSize?: string | null) {
  return String(packSize ?? '').trim() || '-';
}

export function formatItemTotalQuantity(packSize: string | undefined | null, orderedQuantity: number) {
  const safeOrderedQuantity = Number(orderedQuantity || 0);
  const parsed = parsePackSize(packSize);
  const packText = formatPackSize(packSize);

  if (!parsed || safeOrderedQuantity <= 0) {
    return packText === '-' ? String(safeOrderedQuantity) : `${packText} x ${safeOrderedQuantity}`;
  }

  return formatBaseQuantity(parsed.baseValue * safeOrderedQuantity, parsed.family, parsed.unit);
}

export function formatItemRate(unitPrice: number, packSize?: string | null) {
  const packText = formatPackSize(packSize);
  const price = `₹${Number(unitPrice || 0).toLocaleString()}`;
  return packText === '-' ? price : `${price} / ${packText}`;
}

export function formatOrderTotalQuantity(items: OrderItem[]) {
  const totals = new Map<string, { value: number; family: ParsedPackSize['family']; unit: string }>();
  const fallbackParts: string[] = [];

  items.forEach(item => {
    const orderedQuantity = Number(item.quantity || 0);
    const parsed = parsePackSize(item.unit);

    if (!parsed || orderedQuantity <= 0) {
      fallbackParts.push(formatItemTotalQuantity(item.unit, orderedQuantity));
      return;
    }

    const key = parsed.family === 'custom' ? `${parsed.family}:${parsed.unit}` : parsed.family;
    const existing = totals.get(key);
    const value = parsed.baseValue * orderedQuantity;
    if (existing) {
      existing.value += value;
    } else {
      totals.set(key, { value, family: parsed.family, unit: parsed.unit });
    }
  });

  const totalParts = Array.from(totals.values()).map(total => {
    if (total.family === 'count') return `${formatNumber(total.value)} units`;
    return formatBaseQuantity(total.value, total.family, total.unit);
  });

  return [...totalParts, ...fallbackParts].filter(Boolean).join(' + ') || '0';
}

export function getPackagingPiecesText(name: string, category: string, qty: number): string {
  const lowerName = String(name || '').toLowerCase();
  const lowerCat = String(category || '').toLowerCase();

  // Ice Cream rules:
  if (lowerCat.includes('icecream') || lowerCat.includes('ice cream') || lowerName.includes('ice cream') || lowerName.includes('icecream') || lowerName.includes('cone') || lowerName.includes('cup')) {
    if (lowerName.includes('20 mrp') || lowerName.includes('20mrp') || lowerName.includes('cup')) {
      return ` (${qty * 24} pcs)`;
    }
    if (lowerName.includes('35 mrp') || lowerName.includes('35mrp') || lowerName.includes('cone')) {
      return ` (${qty * 20} pcs)`;
    }
    return ` (${qty * 24} pcs)`;
  }

  // Milk rules:
  if (lowerName.includes('500ml') || lowerName.includes('500 ml')) {
    return ` (${qty * 24} pouches)`;
  }
  if (lowerName.includes('1l') || lowerName.includes('1 l') || lowerName.includes('1litre') || lowerName.includes('1 litre')) {
    return ` (${qty * 12} pouches)`;
  }
  if (lowerName.includes('200ml') || lowerName.includes('200 ml')) {
    return ` (${qty * 40} cups)`;
  }

  return '';
}

export function formatInvoiceShareItem(item: OrderItem) {
  const totalQuantity = formatItemTotalQuantity(item.unit, item.quantity);
  const extraText = getPackagingPiecesText(item.productName, item.category || '', item.quantity);
  const amount = Number(item.quantity || 0) * Number(item.unitPrice || 0);
  return `${item.productName} (${totalQuantity}${extraText}) @ ${formatItemRate(item.unitPrice, item.unit)} = ₹${amount.toLocaleString()}`;
}
