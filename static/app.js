const dropZone = document.getElementById("drop-zone");
const dropContent = document.getElementById("drop-zone-content");
const preview = document.getElementById("preview");
const fileInput = document.getElementById("file-input");
const analyzeBtn = document.getElementById("analyze-btn");
const uploadSection = document.getElementById("upload-section");
const loading = document.getElementById("loading");
const errorSection = document.getElementById("error-section");
const errorMessage = document.getElementById("error-message");
const results = document.getElementById("results");

let selectedFile = null;

// Max dimension for resizing before upload
const MAX_IMAGE_DIM = 1568;

// Drop zone events
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith("image/")) {
        alert("Please select an image file.");
        return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = "block";
        dropContent.style.display = "none";
    };
    reader.readAsDataURL(file);
    analyzeBtn.disabled = false;
}

// Resize image client-side to reduce upload size
function resizeImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const { width, height } = img;
            if (width <= MAX_IMAGE_DIM && height <= MAX_IMAGE_DIM) {
                resolve(file);
                return;
            }
            const scale = MAX_IMAGE_DIM / Math.max(width, height);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })),
                "image/jpeg",
                0.9
            );
        };
        img.src = URL.createObjectURL(file);
    });
}

// Analyze
analyzeBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    uploadSection.style.display = "none";
    loading.style.display = "block";
    errorSection.style.display = "none";
    results.style.display = "none";

    try {
        const resized = await resizeImage(selectedFile);
        const formData = new FormData();
        formData.append("image", resized);

        const response = await fetch("/analyze", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Analysis failed");
        }

        renderResults(data);
    } catch (err) {
        loading.style.display = "none";
        errorSection.style.display = "block";
        errorMessage.textContent = err.message;
    }
});

function renderResults(data) {
    loading.style.display = "none";
    results.style.display = "block";

    // Total pieces
    document.getElementById("total-pieces").textContent =
        `Estimated total: ${data.total_pieces || "?"} pieces`;

    // Notes
    const notesEl = document.getElementById("notes");
    if (data.notes) {
        notesEl.textContent = data.notes;
        notesEl.style.display = "block";
    } else {
        notesEl.style.display = "none";
    }

    // Sorting plan
    const planSteps = document.getElementById("plan-steps");
    planSteps.innerHTML = "";
    if (data.sorting_plan) {
        data.sorting_plan.forEach((step) => {
            const li = document.createElement("li");
            const catName = getCategoryName(step.category_id);
            li.innerHTML = `<span class="step-category">${catName}</span> <span class="step-reason">&mdash; ${step.reason}</span>`;
            planSteps.appendChild(li);
        });
    }

    // Category cards - hide all first
    document.querySelectorAll(".category-card").forEach((card) => {
        card.style.display = "none";
        card.querySelector(".piece-list").innerHTML = "";
        card.querySelector(".piece-count").textContent = "0";
    });

    // Populate categories that have pieces
    if (data.categories) {
        for (const [catId, catData] of Object.entries(data.categories)) {
            const card = document.getElementById(`card-${catId}`);
            if (!card) continue;

            const pieces = catData.pieces || [];
            if (pieces.length === 0) continue;

            card.style.display = "block";
            const totalQty = pieces.reduce((sum, p) => sum + (p.quantity || 1), 0);
            card.querySelector(".piece-count").textContent = totalQty;

            const list = card.querySelector(".piece-list");
            pieces.forEach((piece) => {
                const li = document.createElement("li");
                const confidenceClass = piece.confidence === "low" ? "confidence-low" :
                    piece.confidence === "medium" ? "confidence-medium" : "";
                li.className = confidenceClass;
                li.innerHTML = `
                    <span>${piece.description}</span>
                    <span class="piece-qty">&times;${piece.quantity || 1}</span>
                `;
                list.appendChild(li);
            });
        }
    }
}

function getCategoryName(id) {
    const card = document.getElementById(`card-${id}`);
    if (card) {
        return card.querySelector(".category-name").textContent;
    }
    return id;
}

// Retry / New analysis
document.getElementById("retry-btn").addEventListener("click", resetToUpload);
document.getElementById("new-analysis-btn").addEventListener("click", resetToUpload);

function resetToUpload() {
    results.style.display = "none";
    errorSection.style.display = "none";
    loading.style.display = "none";
    uploadSection.style.display = "block";
    // Reset image
    preview.style.display = "none";
    dropContent.style.display = "block";
    selectedFile = null;
    fileInput.value = "";
    analyzeBtn.disabled = true;
}
