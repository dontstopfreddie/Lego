import { useState } from "react";
import CATEGORIES from "../categories.js";

export default function ReviewEditor({ pieces, photoUrl, notes, onSave, onCancel }) {
  const [editPieces, setEditPieces] = useState(
    pieces.map((p) => ({ ...p }))
  );

  function updatePiece(id, field, value) {
    setEditPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  }

  function removePiece(id) {
    setEditPieces((prev) => prev.filter((p) => p.id !== id));
  }

  function addPiece() {
    setEditPieces((prev) => [
      ...prev,
      {
        id: `manual_${Date.now()}`,
        part_name: "",
        part_num: "",
        color: "",
        quantity: 1,
        category_id: 12,
        subcategory: "",
        confidence: "manual",
        verified: true,
        img_url: null,
      },
    ]);
  }

  const total = editPieces.reduce((s, p) => s + (parseInt(p.quantity) || 0), 0);

  return (
    <div className="review-editor">
      <div className="review-layout">
        <div className="review-photo-col">
          {photoUrl && <img src={photoUrl} alt="LEGO pile" className="review-photo" />}
          {notes && <p className="review-notes">{notes}</p>}
          <div className="review-stats">
            <div className="stat-big">{editPieces.length} types</div>
            <div className="stat-big">{total} pieces</div>
          </div>
        </div>

        <div className="review-list-col">
          <h3>Identified Pieces</h3>
          <p className="review-hint">Edit, remove, or add pieces before saving</p>

          <div className="piece-list">
            {editPieces.map((p) => (
              <div
                key={p.id}
                className={`piece-row ${p.confidence === "low" ? "low-conf" : ""}`}
              >
                <div className="piece-row-main">
                  <input
                    className="input-name"
                    value={p.part_name}
                    onChange={(e) => updatePiece(p.id, "part_name", e.target.value)}
                    placeholder="Part name"
                  />
                  <input
                    className="input-num"
                    value={p.part_num}
                    onChange={(e) => updatePiece(p.id, "part_num", e.target.value)}
                    placeholder="#"
                  />
                  <input
                    className="input-color"
                    value={p.color}
                    onChange={(e) => updatePiece(p.id, "color", e.target.value)}
                    placeholder="Color"
                  />
                  <input
                    className="input-qty"
                    type="number"
                    min="1"
                    value={p.quantity}
                    onChange={(e) =>
                      updatePiece(p.id, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                  <select
                    className="input-cat"
                    value={p.category_id}
                    onChange={(e) =>
                      updatePiece(p.id, "category_id", parseInt(e.target.value))
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} {c.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn-remove" onClick={() => removePiece(p.id)}>
                    ✕
                  </button>
                </div>
                {p.confidence === "low" && (
                  <div className="conf-badge">Low confidence — please verify</div>
                )}
              </div>
            ))}
          </div>

          <button className="btn-secondary" onClick={addPiece}>
            + Add a Piece
          </button>
        </div>
      </div>

      <div className="review-actions">
        <button className="btn-secondary" onClick={onCancel}>
          Discard
        </button>
        <button className="btn-primary btn-large" onClick={() => onSave(editPieces)}>
          Save {total} Pieces to Inventory
        </button>
      </div>
    </div>
  );
}
