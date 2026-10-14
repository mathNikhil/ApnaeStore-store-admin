/**
 * Generates the HTML string for the QR print sheet.
 * Uses window.open + document.write pattern — same as invoice print.
 * No PDF library needed.
 */

import QRCode from 'qrcode';

export const renderQRPrintHTML = async (products, qrSize = 5, storeName = '') => {
  // Generate QR image data URLs for all products
  const productQRs = await Promise.all(
    products.map(async (p) => {
      const dataUrl = await QRCode.toDataURL(p.token, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      return { ...p, qrDataUrl: dataUrl };
    })
  );

  const sizePx = qrSize * 37.8; // cm to px approx
  const labelSize = Math.max(11, qrSize * 2.2);

  const cards = productQRs.map(p => `
    <div class="qr-card" style="width:${sizePx}px; break-inside: avoid;">
      <img src="${p.qrDataUrl}" style="width:${sizePx}px; height:${sizePx}px; display:block;" />
      <div class="product-name" style="font-size:${labelSize}px;">${escapeHtml(p.name)}</div>
      ${p.variant_name ? `<div class="variant" style="font-size:${labelSize - 2}px;">${escapeHtml(p.variant_name)}</div>` : ''}
      <div class="price" style="font-size:${labelSize}px;">₹${Number(p.price).toLocaleString('en-IN')}</div>
      ${p.sku ? `<div class="sku" style="font-size:${labelSize - 3}px;">SKU: ${escapeHtml(p.sku)}</div>` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>QR Codes — ${escapeHtml(storeName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; padding: 16px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
    .header h1 { font-size: 18px; color: #111; }
    .header p { font-size: 12px; color: #888; margin-top: 4px; }
    .grid { display: flex; flex-wrap: wrap; gap: 16px; justify-content: flex-start; }
    .qr-card {
      text-align: center; padding: 8px;
      border: 1px dashed #ccc; border-radius: 8px;
    }
    .product-name { font-weight: 700; color: #111; margin-top: 6px; line-height: 1.2; }
    .variant { color: #555; margin-top: 2px; }
    .price { color: #1a56db; font-weight: 700; margin-top: 4px; }
    .sku { color: #999; margin-top: 2px; }
    @media print {
      .no-print { display: none; }
      body { padding: 0; }
      .grid { gap: 12px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(storeName)} — Product QR Codes</h1>
    <p>Printed on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
  <div class="grid">${cards}</div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
