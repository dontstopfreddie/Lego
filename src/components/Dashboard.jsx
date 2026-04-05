import CATEGORIES from "../categories.js";
import { getCategoryCounts } from "../services/inventory.js";

export default function Dashboard({ pieces, onUpload, onExport, onCatalog, onClear }) {
  const counts = getCategoryCounts(pieces);
  const grandTotal = pieces.reduce((s, p) => s + p.quantity, 0);

  return (
    <div className="dashboard">
      <div className="dash-hero">
        <div className="dash-total">
          <span className="total-num">{grandTotal}</span>
          <span className="total-label">LEGO pieces</span>
        </div>
        <div className="dash-actions">
          <button className="btn-primary btn-large" onClick={onUpload}>
            📸 Add Photos
          </button>
          {grandTotal > 0 && (
            <>
              <button className="btn-secondary" onClick={onExport}>
                📊 Download Spreadsheet
              </button>
              <button className="btn-secondary" onClick={onCatalog}>
                📖 View Catalog
              </button>
              <button className="btn-danger-small" onClick={onClear}>
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      <div className="category-grid">
        {CATEGORIES.map((cat) => {
          const count = counts[cat.id] || 0;
          return (
            <div
              key={cat.id}
              className={`category-card ${count > 0 ? "has-pieces" : "empty"}`}
              style={{ borderTopColor: cat.color }}
            >
              <div className="card-number" style={{ color: cat.color }}>
                #{cat.id}
              </div>
              <div className="card-icon">{cat.icon}</div>
              <div className="card-name">{cat.name}</div>
              <div className="card-count" style={{ background: count > 0 ? cat.color : "#ddd" }}>
                {count}
              </div>
              {count > 0 && (
                <div className="card-bar">
                  <div
                    className="card-bar-fill"
                    style={{
                      width: `${Math.min(100, (count / Math.max(grandTotal, 1)) * 500)}%`,
                      background: cat.color,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pieces.length > 0 && (
        <div className="inventory-table-wrapper">
          <h3>All Pieces</h3>
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Cat</th>
                <th>Part</th>
                <th>Part #</th>
                <th>Color</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {[...pieces]
                .sort((a, b) => a.category_id - b.category_id || (a.part_num || "").localeCompare(b.part_num || ""))
                .map((p, i) => (
                  <tr key={p.id || i}>
                    <td>
                      <span
                        className="cat-dot"
                        style={{
                          background: CATEGORIES.find((c) => c.id === p.category_id)?.color,
                        }}
                      >
                        {p.category_id}
                      </span>
                    </td>
                    <td>{p.part_name}</td>
                    <td className="mono">{p.part_num || "—"}</td>
                    <td>{p.color}</td>
                    <td className="qty">{p.quantity}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
