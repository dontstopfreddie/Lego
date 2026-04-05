import { GoogleGenerativeAI } from "@google/generative-ai";
import CATEGORIES from "../categories.js";

function buildPrompt() {
  const catList = CATEGORIES.map(
    (c) =>
      `${c.id}. ${c.name}: ${c.description}${c.subcategories.length ? `. Subcategories: ${c.subcategories.join(", ")}` : ""}`
  ).join("\n");

  return `You are a LEGO brick identification expert. Analyze this photo of loose LEGO pieces.

For EVERY visible LEGO piece, identify:
1. Part name (e.g., "Brick 2x4", "Plate 1x6", "Slope 45 2x1")
2. Likely LEGO part number (e.g., 3001 for Brick 2x4, 3666 for Plate 1x6). Be as accurate as possible using your knowledge of LEGO part numbers.
3. Color using official LEGO color names (e.g., "Bright Red", "Dark Bluish Gray", "White", "Black", "Bright Yellow", "Dark Green", "Bright Blue", "Tan", "Reddish Brown", "Light Bluish Gray")
4. Quantity — count how many of that exact part+color combination you see
5. Category number (1-12) from this list:
${catList}
6. Subcategory (if the category has subcategories listed above)

IMPORTANT RULES:
- Count EVERY piece you can see, even partially hidden ones
- Be specific about part numbers — use real LEGO part numbers
- Distinguish between plates (1/3 brick height), bricks (full height), and tiles (plate height, smooth top)
- A "1x2 plate" is part 3023, a "1x2 brick" is 3004, a "1x2 tile" is 3069
- Group identical part+color combinations and sum the quantity
- If you're uncertain about a part number, still give your best guess

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "pieces": [
    {
      "part_name": "Brick 2x4",
      "part_num": "3001",
      "color": "Bright Red",
      "quantity": 3,
      "category_id": 5,
      "subcategory": "Regular",
      "confidence": "high"
    }
  ],
  "total_count": 0,
  "notes": "observations about the pile"
}`;
}

export async function analyzePhoto(apiKey, imageBase64, mimeType = "image/jpeg") {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    buildPrompt(),
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const text = result.response.text();

  // Strip markdown code blocks if present
  let jsonStr = text;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1];

  const parsed = JSON.parse(jsonStr);

  // Normalize: ensure every piece has required fields
  const pieces = (parsed.pieces || []).map((p, i) => ({
    id: `piece_${Date.now()}_${i}`,
    part_name: p.part_name || "Unknown",
    part_num: String(p.part_num || ""),
    color: p.color || "Unknown",
    quantity: Math.max(1, parseInt(p.quantity) || 1),
    category_id: parseInt(p.category_id) || 12,
    subcategory: p.subcategory || "",
    confidence: p.confidence || "medium",
    verified: false,
    img_url: null,
  }));

  return {
    pieces,
    total_count: parsed.total_count || pieces.reduce((s, p) => s + p.quantity, 0),
    notes: parsed.notes || "",
  };
}
