import QRCode from 'qrcode';

export const renderQRPrintHTML = async (products, storeName = '') => {
  // Generate one QR image per product — each gets its own unique token
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
    // Parse size and unit from size_label e.g. "500 ml" → size="500", unit="ml"
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
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:10mm 8mm}

.header{text-align:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #ddd}
.header h1{font-size:15px;font-weight:700}
.header p{font-size:11px;color:#888;margin-top:3px}

.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}

.card{
  border:1px solid #ccc;border-radius:7px;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;
  background:#fff;break-inside:avoid;page-break-inside:avoid
}

.qr-wrap{width:100%;padding:7px 7px 3px;display:flex;justify-content:center;background:#fff}
.qr-img{width:100%;max-width:115px;height:auto;display:block}

.prod-img-wrap{
  width:100%;height:75px;overflow:hidden;
  display:flex;align-items:center;justify-content:center;
  background:#f5f5f5;border-top:1px solid #eee;border-bottom:1px solid #eee
}
.prod-img{width:100%;height:100%;object-fit:cover}
.no-img{font-size:26px;color:#bbb}

.info{width:100%;padding:6px 8px 8px;text-align:center}
.name{font-size:10px;font-weight:700;color:#111;line-height:1.3;margin-bottom:2px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.meta{font-size:9px;color:#555;margin-bottom:1px;line-height:1.3}
.unit{color:#999}
.price{font-size:12px;font-weight:700;color:#1a56db;margin-top:4px}

@media print{
  @page{size:A4 portrait;margin:10mm 8mm}
  body{padding:0}
  .grid{gap:8px}
  .card{border-color:#bbb}
  .qr-img{max-width:105px}
  .prod-img-wrap{height:68px}
}
</style>
</head>
<body>
<div class="header">
  <h1>${esc(storeName)} — Product QR Labels</h1>
  <p>Printed on ${date} &nbsp;·&nbsp; ${productQRs.length} label${productQRs.length !== 1 ? 's' : ''}</p>
</div>
<div class="grid">${cards}</div>
<script>
window.addEventListener('load',function(){setTimeout(function(){window.print();},500);});
<\/script>
</body>
</html>`;
};

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
