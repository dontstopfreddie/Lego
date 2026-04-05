import * as XLSX from "xlsx";
import CATEGORIES from "../categories.js";

export function exportSpreadsheet(pieces) {
  // Sort by category, then part number
  const sorted = [...pieces].sort((a, b) => {
    if (a.category_id !== b.category_id) return a.category_id - b.category_id;
    return (a.part_num || "").localeCompare(b.part_num || "");
  });

  const rows = [];
  let currentCat = null;
  let catTotal = 0;

  for (const p of sorted) {
    if (currentCat !== null && currentCat !== p.category_id) {
      const cat = CATEGORIES.find((c) => c.id === currentCat);
      rows.push({
        "Category #": "",
        "Category Name": `SUBTOTAL: ${cat?.name || ""}`,
        Subcategory: "",
        "Part Number": "",
        "Part Name": "",
        Color: "",
        Quantity: catTotal,
        "Photo Source": "",
      });
      catTotal = 0;
    }
    currentCat = p.category_id;
    const cat = CATEGORIES.find((c) => c.id === p.category_id);

    rows.push({
      "Category #": p.category_id,
      "Category Name": cat?.name || "",
      Subcategory: p.subcategory || "",
      "Part Number": p.part_num || "",
      "Part Name": p.part_name || "",
      Color: p.color || "",
      Quantity: p.quantity,
      "Photo Source": p.photo_source || "",
    });
    catTotal += p.quantity;
  }

  // Final subtotal
  if (currentCat !== null) {
    const cat = CATEGORIES.find((c) => c.id === currentCat);
    rows.push({
      "Category #": "",
      "Category Name": `SUBTOTAL: ${cat?.name || ""}`,
      Subcategory: "",
      "Part Number": "",
      "Part Name": "",
      Color: "",
      Quantity: catTotal,
      "Photo Source": "",
    });
  }

  // Grand total
  const grandTotal = pieces.reduce((s, p) => s + p.quantity, 0);
  rows.push({
    "Category #": "",
    "Category Name": "GRAND TOTAL",
    Subcategory: "",
    "Part Number": "",
    "Part Name": "",
    Color: "",
    Quantity: grandTotal,
    "Photo Source": "",
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");

  // Column widths
  ws["!cols"] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 25 },
    { wch: 14 },
    { wch: 30 },
    { wch: 22 },
    { wch: 10 },
    { wch: 20 },
  ];

  XLSX.writeFile(wb, "lego-inventory.xlsx");
}

export function generateCatalogHTML(pieces) {
  const grandTotal = pieces.reduce((s, p) => s + p.quantity, 0);
  let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>LEGO Parts Catalog</title>
<style>
  @page { size: A4; margin: 15mm; }
  @media print { .page-break { page-break-before: always; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', 'Helvetica Neue', sans-serif; background: #fff; color: #333; }
  .page { padding: 20px; max-width: 210mm; margin: 0 auto 40px; }
  .page-break + .page { margin-top: 0; }
  .cat-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #333; }
  .cat-num { font-size: 48px; font-weight: 900; line-height: 1; }
  .cat-name { font-size: 28px; font-weight: 700; }
  .cat-desc { font-size: 14px; color: #666; }
  .cat-count { margin-left: auto; font-size: 20px; font-weight: 700; color: #666; }
  .subcat-label { font-size: 14px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px; grid-column: 1 / -1; }
  .parts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
  .part-cell { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px; text-align: center; position: relative; }
  .part-cell img { width: 72px; height: 72px; object-fit: contain; display: block; margin: 0 auto 6px; }
  .part-cell .no-img { width: 72px; height: 72px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #aaa; margin: 0 auto 6px; }
  .part-count { position: absolute; top: 6px; left: 6px; background: #333; color: #fff; font-size: 13px; font-weight: 700; padding: 1px 6px; border-radius: 3px; }
  .part-num { font-size: 11px; color: #999; }
  .part-name { font-size: 12px; font-weight: 600; margin-top: 2px; line-height: 1.2; }
  .page-total { margin-top: 16px; text-align: right; font-size: 14px; color: #666; font-weight: 600; }
  .print-btn { display: block; margin: 20px auto; padding: 12px 32px; font-size: 18px; font-weight: 700; background: #D32F2F; color: white; border: none; border-radius: 8px; cursor: pointer; }
  .print-btn:hover { background: #B71C1C; }
  @media print { .print-btn { display: none; } }
</style></head><body>
<button class="print-btn" onclick="window.print()">Print Catalog</button>`;

  CATEGORIES.forEach((cat, catIdx) => {
    const catPieces = pieces.filter((p) => p.category_id === cat.id);
    if (catPieces.length === 0) return;

    // Deduplicate by part_num (shape only, collapse colors)
    const shapeMap = {};
    for (const p of catPieces) {
      const key = p.part_num || p.part_name;
      if (!shapeMap[key]) {
        shapeMap[key] = { ...p, total_qty: 0, colors: {} };
      }
      shapeMap[key].total_qty += p.quantity;
      shapeMap[key].colors[p.color] = (shapeMap[key].colors[p.color] || 0) + p.quantity;
      if (p.img_url && !shapeMap[key].img_url) {
        shapeMap[key].img_url = p.img_url;
      }
    }

    // For each shape, pick the most common color for display
    const shapes = Object.values(shapeMap).map((s) => {
      const topColor = Object.entries(s.colors).sort((a, b) => b[1] - a[1])[0][0];
      return { ...s, display_color: topColor };
    });

    const catTotal = shapes.reduce((s, p) => s + p.total_qty, 0);

    // Group by subcategory
    const subGroups = {};
    for (const s of shapes) {
      const sub = s.subcategory || "General";
      if (!subGroups[sub]) subGroups[sub] = [];
      subGroups[sub].push(s);
    }

    html += `${catIdx > 0 ? '<div class="page-break"></div>' : ""}
<div class="page">
  <div class="cat-header">
    <div class="cat-num" style="color:${cat.color}">#${cat.id}</div>
    <div><div class="cat-name">${cat.name}</div><div class="cat-desc">${cat.description}</div></div>
    <div class="cat-count">${catTotal} pieces</div>
  </div>
  <div class="parts-grid">`;

    for (const [subName, subPieces] of Object.entries(subGroups)) {
      if (cat.subcategories.length > 0 && Object.keys(subGroups).length > 1) {
        html += `<div class="subcat-label">${subName}</div>`;
      }
      for (const p of subPieces) {
        const imgHtml = p.img_url
          ? `<img src="${p.img_url}" alt="${p.part_name}" loading="lazy">`
          : `<div class="no-img">${p.part_name.slice(0, 20)}</div>`;
        html += `
    <div class="part-cell">
      <div class="part-count">${p.total_qty}x</div>
      ${imgHtml}
      <div class="part-num">${p.part_num || "?"}</div>
      <div class="part-name">${p.part_name}</div>
    </div>`;
      }
    }

    html += `
  </div>
  <div class="page-total">Total: ${catTotal} pieces</div>
</div>`;
  });

  html += `
<div class="page" style="text-align:center; padding-top:40px;">
  <div style="font-size:36px; font-weight:900;">Grand Total: ${grandTotal} pieces</div>
</div>
</body></html>`;

  return html;
}
