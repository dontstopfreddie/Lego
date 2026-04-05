const BASE = "https://rebrickable.com/api/v3/lego";

export async function lookupPart(apiKey, partNum) {
  const res = await fetch(`${BASE}/parts/${partNum}/?key=${apiKey}`);
  if (!res.ok) return null;
  return res.json();
}

export async function searchParts(apiKey, query, limit = 10) {
  const res = await fetch(
    `${BASE}/parts/?search=${encodeURIComponent(query)}&page_size=${limit}&key=${apiKey}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function getPartImage(apiKey, partNum) {
  const part = await lookupPart(apiKey, partNum);
  return part?.part_img_url || null;
}

// Batch enrich: look up images for an array of pieces
export async function enrichPiecesWithImages(apiKey, pieces) {
  if (!apiKey) return pieces;

  // Deduplicate part numbers to minimize API calls
  const uniqueNums = [...new Set(pieces.map((p) => p.part_num).filter(Boolean))];

  const imageMap = {};
  // Process in batches of 5 to avoid rate limiting
  for (let i = 0; i < uniqueNums.length; i += 5) {
    const batch = uniqueNums.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (num) => {
        const part = await lookupPart(apiKey, num);
        return { num, img: part?.part_img_url || null, name: part?.name || null };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        imageMap[r.value.num] = r.value;
      }
    }
    // Small delay between batches
    if (i + 5 < uniqueNums.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return pieces.map((p) => {
    const match = imageMap[p.part_num];
    return {
      ...p,
      img_url: match?.img || p.img_url,
      // Update name if Rebrickable has a better one
      part_name: match?.name || p.part_name,
    };
  });
}
