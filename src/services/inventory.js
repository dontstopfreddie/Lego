const STORAGE_KEY = "lego_inventory";

export function loadInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { pieces: [], sessions: [] };
  } catch {
    return { pieces: [], sessions: [] };
  }
}

export function saveInventory(inventory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

export function addPiecesToInventory(newPieces, photoSource) {
  const inv = loadInventory();
  const sessionId = `session_${Date.now()}`;

  const tagged = newPieces.map((p) => ({
    ...p,
    photo_source: photoSource,
    session_id: sessionId,
    added_at: new Date().toISOString(),
  }));

  // Merge: if same part_num + color exists, add quantities
  for (const newPiece of tagged) {
    const existing = inv.pieces.find(
      (p) => p.part_num === newPiece.part_num && p.color === newPiece.color && newPiece.part_num
    );
    if (existing) {
      existing.quantity += newPiece.quantity;
      // Update image if we have a better one
      if (newPiece.img_url && !existing.img_url) {
        existing.img_url = newPiece.img_url;
      }
    } else {
      inv.pieces.push(newPiece);
    }
  }

  inv.sessions.push({
    id: sessionId,
    photo: photoSource,
    count: newPieces.reduce((s, p) => s + p.quantity, 0),
    date: new Date().toISOString(),
  });

  saveInventory(inv);
  return inv;
}

export function updatePiece(pieceId, updates) {
  const inv = loadInventory();
  const idx = inv.pieces.findIndex((p) => p.id === pieceId);
  if (idx >= 0) {
    inv.pieces[idx] = { ...inv.pieces[idx], ...updates };
    saveInventory(inv);
  }
  return inv;
}

export function removePiece(pieceId) {
  const inv = loadInventory();
  inv.pieces = inv.pieces.filter((p) => p.id !== pieceId);
  saveInventory(inv);
  return inv;
}

export function clearInventory() {
  saveInventory({ pieces: [], sessions: [] });
  return { pieces: [], sessions: [] };
}

export function getCategoryCounts(pieces) {
  const counts = {};
  for (let i = 1; i <= 12; i++) counts[i] = 0;
  for (const p of pieces) {
    counts[p.category_id] = (counts[p.category_id] || 0) + p.quantity;
  }
  return counts;
}
