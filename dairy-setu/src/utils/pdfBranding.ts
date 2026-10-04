import type jsPDF from 'jspdf';

interface PdfBrandAssets {
  logoDataUrl: string;
  watermarkDataUrl: string;
}

let cachedAssetsPromise: Promise<PdfBrandAssets | null> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    img.src = src;
  });
}

function makeLogoPng(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function makeWatermarkPng(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    const nearWhite = r > 245 && g > 245 && b > 245;

    if (nearWhite) {
      pixels[i + 3] = 0;
    } else {
      pixels[i + 3] = Math.max(8, Math.round(a * 0.1));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function getPdfBrandAssets(): Promise<PdfBrandAssets | null> {
  if (typeof window === 'undefined') return null;
  if (!cachedAssetsPromise) {
    cachedAssetsPromise = (async () => {
      const img = await loadImage('/dairy-walla-logo.webp');
      return {
        logoDataUrl: makeLogoPng(img),
        watermarkDataUrl: makeWatermarkPng(img),
      };
    })().catch(() => null);
  }
  return cachedAssetsPromise;
}

export function addPdfLogoWatermark(doc: jsPDF, watermarkDataUrl: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const size = Math.min(pageW * 0.72, pageH * 0.52);
  const x = (pageW - size) / 2;
  const y = (pageH - size) / 2;

  doc.addImage(watermarkDataUrl, 'PNG', x, y, size, size, undefined, 'FAST');
}
