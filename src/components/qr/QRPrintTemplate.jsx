/**
 * Generates the HTML string for the QR print sheet — A4 grid layout.
 * Each card: QR code top, then product image, name, variant, size, unit, price.
 * Opens in a new window and auto-triggers browser print dialog.
 */

import QRCode from 'qrcode';

export const renderQRPrintHTML = async (products, storeName = '') => {
  // Generate QR data URLs for all products
  const productQRs = await Promise.all(
    products.map(async (p) => {
      const dataUrl = await QRCode.toDataURL(p.token, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
      return { ...p, qrDataUrl: dataUrl };
    })
  );

  const cards = productQRs.map(p => {
    // Extract unit from size_label e.g. "500 ml" → unit = "ml", size = "500"
    const sizeLabel = p.size_label || p.size || '';
    const sizeMatch = sizeLabel.match(/^([\d.]+)\s*(.*)$/);
    const sizeNum  = sizeMatch ? sizeMatch[1] : sizeLabel;
    const unit     = sizeMatch ? sizeMatch[2].trim() : '';

    const name        = escapeHtml(p.product_name || p.name || 'Product');
    const variant     = escapeHtml(p.variation_name || p.variant_name || '');
    const price       = Number(p.selling_price || p.price || 0).toLocaleString('en-IN');
    const imageUrl    = p.image_url || '';

    return `
  <div class="card">
    <div class="qr-wrap">
      <img class="qr-img" src="${p.qrDataUrl}" alt="QR" />
    </div>
    ${imageUrl ? `<div class="prod-img-wrap"><img class="prod-img" src="${escapeHtml(imageUrl)}" alt="" /></div>` : '<div class="prod-img-wrap no-img">📦</div>'}
    <div class="prod-info">
      <div class="prod-name">${name}</div>
      ${variant  ? `<div class="prod-meta variant">${variant}</div>` : ''}
      ${sizeNum  ? `<div class="prod-meta size">${escapeHtml(sizeNum)}${unit ? ' <span class="unit">' + escapeHtml(unit) + '</span>' : ''}</div>` : ''}
      <div class="prod-price">₹${price}</div>
    </div>
  </div>`;
  }).join('');

  const printDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>QR Labels — ${escapeHtml(storeName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #111;
    }

    .page-header {
      text-align: center;
      padding: 14px 20px 10px;
      border-bottom: 1px solid #ddd;
      margin-bottom: 16px;
    }
    .page-header h1 { font-size: 16px; font-weight: 700; }
    .page-header p  { font-size: 11px; color: #777; margin-top: 3px; }

    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 0 14px 20px;
    }

    .card {
      border: 1px solid #d0d0d0;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #fff;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* QR code — top section, full-width */
    .qr-wrap {
      width: 100%;
      background: #fff;
      padding: 8px 8px 4px;
      display: flex;
      justify-content: center;
    }
    .qr-img {
      width: 100%;
      max-width: 120px;
      height: auto;
      display: block;
    }

    /* Product image — middle section */
    .prod-img-wrap {
      width: 100%;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #eee;
      overflow: hidden;
    }
    .prod-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .no-img {
      font-size: 28px;
      color: #ccc;
    }

    /* Text info — bottom section */
    .prod-info {
      width: 100%;
      padding: 7px 8px 9px;
      text-align: center;
    }
    .prod-name {
      font-size: 11px;
      font-weight: 700;
      color: #111;
      line-height: 1.3;
      margin-bottom: 3px;
      /* clamp to 2 lines */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .prod-meta {
      font-size: 10px;
      color: #555;
      margin-bottom: 1px;
      line-height: 1.3;
    }
    .prod-meta.size { color: #444; }
    .unit { color: #888; }
    .prod-price {
      font-size: 13px;
      font-weight: 700;
      color: #1a56db;
      margin-top: 5px;
    }

    /* ── PRINT STYLES ── */
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 8mm;
      }

      body { background: #fff; }

      .page-header { margin-bottom: 10px; }

      .grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        padding: 0;
      }

      .card {
        border: 1px solid #bbb;
        border-radius: 6px;
      }

      .qr-img { max-width: 110px; }

      .prod-img-wrap { height: 72px; }

      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <h1>${escapeHtml(storeName)} — Product QR Labels</h1>
    <p>Printed on ${printDate} &nbsp;·&nbsp; ${productQRs.length} label${productQRs.length !== 1 ? 's' : ''}</p>
  </div>

  <div class="grid">
    ${cards}
  </div>

  <script>
    // Wait for product images to load before printing
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  <\/script>
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
