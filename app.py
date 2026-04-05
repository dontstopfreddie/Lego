import base64
import json
import os
import re

import anthropic
from flask import Flask, jsonify, render_template, request

from categories import SORTING_CATEGORIES

app = Flask(__name__)

client = anthropic.Anthropic()

SYSTEM_PROMPT = """You are a LEGO brick sorting expert. You will be shown a photo of LEGO pieces.
Your job is to identify every visible piece and classify each into one of 12 sorting categories.

The 12 sorting categories are:
{categories}

Instructions:
- Identify each distinct LEGO piece you can see in the image
- Classify each piece into exactly one of the 12 categories above
- Estimate the quantity of each piece type if there are multiples
- Describe each piece concisely (e.g. "2x4 red brick", "1x1 dark grey round plate")
- If a piece is partially obscured, still attempt to classify it but note uncertainty
- For the sorting_plan, suggest which categories to sort first based on what's easiest to pick out

You MUST respond with valid JSON in exactly this format:
{{
  "categories": {{
    "<category_id>": {{
      "pieces": [
        {{"description": "piece description", "quantity": 1, "confidence": "high|medium|low"}}
      ]
    }}
  }},
  "total_pieces": <estimated total count>,
  "sorting_plan": [
    {{"step": 1, "category_id": "<id>", "reason": "why sort this first"}},
    ...
  ],
  "notes": "any general observations about the pile"
}}

Only include categories that have pieces in them. The category_id values must be one of:
{category_ids}
"""


def build_system_prompt():
    categories_text = "\n".join(
        f"#{c['number']} {c['name']} (id: {c['id']}): {c['description']}. Examples: {c['examples']}"
        for c in SORTING_CATEGORIES
    )
    category_ids = ", ".join(c["id"] for c in SORTING_CATEGORIES)
    return SYSTEM_PROMPT.format(categories=categories_text, category_ids=category_ids)


@app.route("/")
def index():
    return render_template("index.html", categories=SORTING_CATEGORIES)


@app.route("/analyze", methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    image_data = file.read()
    base64_image = base64.standard_b64encode(image_data).decode("utf-8")

    content_type = file.content_type or "image/jpeg"

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=build_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": content_type,
                                "data": base64_image,
                            },
                        },
                        {
                            "type": "text",
                            "text": "Please analyze this pile of LEGO pieces. Identify each piece and sort them into the 12 categories. Then provide an optimal sorting plan.",
                        },
                    ],
                }
            ],
        )

        response_text = response.content[0].text

        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", response_text)
        if json_match:
            result = json.loads(json_match.group(1))
        else:
            result = json.loads(response_text)

        return jsonify(result)

    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse analysis results", "raw": response_text}), 500
    except anthropic.APIError as e:
        return jsonify({"error": f"API error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
