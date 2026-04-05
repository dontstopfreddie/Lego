import CATEGORIES from "../categories.js";

export default function VisualCatalog({ pieces, onBack }) {
  return (
    <div className="catalog">
      <div className="catalog-toolbar no-print">
        <button className="btn-secondary" onClick={onBack}>
          &larr; Back
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          🖨️ Print Catalog
        </button>
      </div>

      {CATEGORIES.map((cat) => {
        const catPieces = pieces.filter((p) => p.category_id === cat.id);
        if (catPieces.length === 0) return null;

        // Deduplicate by shape (part_num), collapse colors
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
        const shapes = Object.values(shapeMap);
        const catTotal = shapes.reduce((s, p) => s + p.total_qty, 0);

        // Group by subcategory
        const subGroups = {};
        for (const s of shapes) {
          const sub = s.subcategory || "General";
          if (!subGroups[sub]) subGroups[sub] = [];
          subGroups[sub].push(s);
        }

        return (
          <div key={cat.id} className="catalog-page">
            <div className="catalog-header">
              <div className="catalog-cat-num" style={{ color: cat.color }}>
                #{cat.id}
              </div>
              <div className="catalog-cat-info">
                <div className="catalog-cat-name">{cat.name}</div>
                <div className="catalog-cat-desc">{cat.description}</div>
              </div>
              <div className="catalog-cat-count">{catTotal} pieces</div>
            </div>

            <div className="catalog-grid">
              {Object.entries(subGroups).map(([subName, subPieces]) => (
                <div key={subName} className="catalog-subgroup">
                  {cat.subcategories.length > 0 && Object.keys(subGroups).length > 1 && (
                    <div className="catalog-subcat-label">{subName}</div>
                  )}
                  <div className="catalog-parts">
                    {subPieces.map((p, i) => (
                      <div key={i} className="catalog-cell">
                        <div className="catalog-qty">{p.total_qty}x</div>
                        {p.img_url ? (
                          <img
                            src={p.img_url}
                            alt={p.part_name}
                            className="catalog-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="catalog-no-img">{p.part_name.slice(0, 18)}</div>
                        )}
                        <div className="catalog-part-num">{p.part_num || "?"}</div>
                        <div className="catalog-part-name">{p.part_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="catalog-page-total">
              Bin #{cat.id} — {catTotal} pieces total
            </div>
          </div>
        );
      })}
    </div>
  );
}
