import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ParsedOrderItem {
  productId: string;
  productName: string;
  brand: string;
  unit: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Parses a raw text message into a list of order items.
 *
 * @param messageBody The raw text from WhatsApp.
 * @param distributorId The ID of the distributor to get the catalog for.
 * @returns An array of parsed items or null if parsing fails.
 */
export async function parseOrderMessage(messageBody: string, distributorId: string): Promise<ParsedOrderItem[] | null> {
  console.log(`[OrderParser] Parsing message for distributor ${distributorId}: "${messageBody}"`);

  // Fetch distributor's available catalog
  const products = await prisma.product.findMany({
    where: { distributorId, available: true }
  });

  if (products.length === 0) return null;

  const items: ParsedOrderItem[] = [];
  const parts = messageBody.toLowerCase().split(/,|\n/);

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    const match = trimmedPart.match(/^(.*)\s+(\d+)$/);
    if (match) {
      const productName = match[1].trim();
      const quantity = parseInt(match[2], 10);
      if (productName && quantity > 0) {
        // Match the text to actual product catalog
        const matchedProduct = products.find(p => 
          p.name.toLowerCase().includes(productName) || 
          productName.includes(p.name.toLowerCase()) ||
          (p.brand && productName.includes(p.brand.toLowerCase()))
        );

        if (matchedProduct) {
          items.push({
            productId: matchedProduct.id,
            productName: matchedProduct.name,
            brand: matchedProduct.brand || '',
            unit: matchedProduct.unit || '',
            unitPrice: Number(matchedProduct.price),
            quantity
          });
        }
      }
    }
  }

  return items.length > 0 ? items : null;
}