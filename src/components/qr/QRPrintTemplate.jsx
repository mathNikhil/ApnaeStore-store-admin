import QRCode from 'qrcode';

export const renderQRPrintHTML = async (products, storeName = '', mode = 'catalog') => {

  if (mode === 'sticker') {
    // ── STICKER MODE ─────────────────────────────────────────────────────────
    // Group products by variant (each product entry is already one variant)
    // Generate one QR per copy (qty), but we only need one QR image per variant
    // since all copies share the same token
    const variantQRs = await Promise.all(
      products.map(async (p) => {
        const dataUrl = await QRCode.toDataURL(p.token, {
          width: 300, margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        return { ...p, qrDataUrl: dataUrl };
      })
    );

    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalStickers = products.reduce((s, p) => s + (p.qty || 1), 0);

    // Build sections: one per variant
    const sections = variantQRs.map(p => {
      const sl = p.size_label || '';
      const sizeMatch = sl.match(/^([\d.]+)\s*(.*)$/);
      const sizeNum = sizeMatch ? sizeMatch[1] : sl;
      const unit    = sizeMatch ? sizeMatch[2].trim() : '';
      const qty     = p.qty || 1;

      const name    = esc(p.product_name || 'Product');
      const variant = esc(p.variation_name || '');
      const price   = Number(p.selling_price || 0).toLocaleString('en-IN');

      // Header row: product · variant · size · unit · price · qty
      const headerParts = [name];
      if (variant) headerParts.push(variant);
      if (sizeNum) headerParts.push(sizeNum + (unit ? ' ' + unit : ''));

      // Repeat QR qty times
      const qrCells = Array.from({ length: qty }, () =>
        `<img class="qr-cell" src="${p.qrDataUrl}" alt="QR" />`
      ).join('');

      return `
<div class="section">
  <div class="section-header">
    <span class="section-title">${headerParts.join(' &nbsp;·&nbsp; ')}</span>
    <span class="section-price">₹${price}</span>
    <span class="section-qty">${qty} sticker${qty !== 1 ? 's' : ''}</span>
  </div>
  <div class="qr-grid">${qrCells}</div>
</div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>QR Stickers — ${esc(storeName)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:8mm 7mm}

.page-header{text-align:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #222}
.page-header h1{font-size:14px;font-weight:700}
.page-header p{font-size:10px;color:#888;margin-top:3px}

.section{margin-bottom:14px;break-inside:avoid;page-break-inside:avoid}

.section-header{
  display:flex;align-items:center;gap:10px;
  background:#f1f5f9;border:1px solid #cbd5e1;
  border-radius:5px;padding:6px 10px;margin-bottom:6px
}
.section-title{font-size:11px;font-weight:700;color:#111;flex:1}
.section-price{font-size:11px;font-weight:700;color:#1a56db;white-space:nowrap}
.section-qty{font-size:10px;color:#888;white-space:nowrap}

.qr-grid{
  display:flex;
  flex-wrap:wrap;
  gap:5px
}
.qr-cell{
  width:80px;
  height:80px;
  display:block;
  border:1px dashed #bbb;
  border-radius:3px;
  padding:2px
}

@media print{
  @page{size:A4 portrait;margin:8mm 7mm}
  body{padding:0}
  .qr-grid{gap:4px}
  .qr-cell{width:76px;height:76px}
  .section{margin-bottom:10px}
}
</style>
</head>
<body>
<div class="page-header">
  <h1>${esc(storeName)} — QR Sticker Sheet</h1>
  <p>Printed on ${date} &nbsp;·&nbsp; ${totalStickers} sticker${totalStickers !== 1 ? 's' : ''} across ${products.length} variant${products.length !== 1 ? 's' : ''} &nbsp;·&nbsp; cut along dashed lines</p>
</div>
${sections}
<script>
window.addEventListener('load',function(){setTimeout(function(){window.print();},500);});
<\/script>
</body>
</html>`;
  }

  // ── CATALOG MODE (unchanged) ──────────────────────────────────────────────
  const productQRs = await Promise.all(
    products.map(async (p) => {
      const dataUrl = await QRCode.toDataURL(p.token, {
        width: 300, margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
      return { ...p, qrDataUrl: dataUrl };
    })
  );

  const cards = productQRs.map(p => {
    const sl = p.size_label || '';
    const sizeMatch = sl.match(/^([\d.]+)\s*(.*)$/);
    const sizeNum = sizeMatch ? sizeMatch[1] : sl;
    const unit    = sizeMatch ? sizeMatch[2].trim() : '';

    const name    = esc(p.product_name || 'Product');
    const variant = esc(p.variation_name || '');
    const price   = Number(p.selling_price || 0).toLocaleString('en-IN');
    const img     = p.image_url ? esc(p.image_url) : '';

    return `
<div class="card">
  <div class="qr-wrap">
    <img class="qr-img" src="${p.qrDataUrl}" alt="QR" />
  </div>
  <div class="right">
    <div class="prod-img-wrap">
      ${img
        ? `<img class="prod-img" src="${img}" alt="" />`
        : `<span class="no-img">📦</span>`}
    </div>
    <div class="info">
      <div class="name">${name}</div>
      ${variant ? `<div class="meta">${variant}</div>` : ''}
      ${sizeNum ? `<div class="meta">${esc(sizeNum)}${unit ? ' <span class="unit">' + esc(unit) + '</span>' : ''}</div>` : ''}
      <div class="price">₹${price}</div>
    </div>
  </div>
</div>`;
  }).join('');

  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>QR Labels — ${esc(storeName)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;color:#111;padding:16px}

.top-bar{
  display:flex;align-items:center;justify-content:space-between;
  background:#fff;border-radius:10px;padding:12px 16px;margin-bottom:14px;
  box-shadow:0 1px 4px rgba(0,0,0,.08)
}
.top-bar-left h1{font-size:15px;font-weight:700;margin:0 0 2px}
.top-bar-left p{font-size:11px;color:#888;margin:0}
.print-btn{
  padding:9px 20px;background:#1a56db;color:#fff;border:none;
  border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
  font-family:inherit;white-space:nowrap
}
.print-btn:hover{background:#1e40af}

.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}

.card{
  border:1px solid #ddd;border-radius:10px;overflow:hidden;
  display:flex;flex-direction:row;align-items:stretch;
  background:#fff;break-inside:avoid;page-break-inside:avoid;
  box-shadow:0 1px 3px rgba(0,0,0,.06)
}

.qr-wrap{
  flex-shrink:0;width:110px;
  display:flex;align-items:center;justify-content:center;
  padding:10px;background:#fff;border-right:1px solid #eee
}
.qr-img{width:90px;height:90px;display:block}

.right{display:flex;flex-direction:column;flex:1;min-width:0}

.prod-img-wrap{
  width:100%;height:80px;overflow:hidden;
  display:flex;align-items:center;justify-content:center;
  background:#f9f9f9;border-bottom:1px solid #eee
}
.prod-img{width:100%;height:100%;object-fit:cover}
.no-img{font-size:24px;color:#bbb}

.info{padding:8px 10px}
.name{font-size:11px;font-weight:700;color:#111;line-height:1.3;margin-bottom:3px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.meta{font-size:10px;color:#666;margin-bottom:1px}
.unit{color:#999}
.price{font-size:13px;font-weight:700;color:#1a56db;margin-top:4px}

@media print{
  @page{size:A4 portrait;margin:8mm}
  body{padding:0;background:#fff}
  .top-bar{display:none}
  .grid{gap:8px}
  .card{box-shadow:none;border-color:#ccc}
  .qr-wrap{width:100px;padding:8px}
  .qr-img{width:82px;height:82px}
  .prod-img-wrap{height:72px}
}
</style>
</head>
<body>
<div class="top-bar">
  <div class="top-bar-left">
    <h1>${esc(storeName)} — Product QR Labels</h1>
    <p>Printed on ${date} &nbsp;·&nbsp; ${productQRs.length} label${productQRs.length !== 1 ? 's' : ''}</p>
  </div>
  <button class="print-btn" onclick="window.print()">🖨️ Print</button>
</div>
<div class="grid">${cards}</div>
</body>
</html>`;
};

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
