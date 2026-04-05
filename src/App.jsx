import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard.jsx";
import PhotoUpload from "./components/PhotoUpload.jsx";
import ReviewEditor from "./components/ReviewEditor.jsx";
import VisualCatalog from "./components/VisualCatalog.jsx";
import Settings from "./components/Settings.jsx";
import { analyzePhoto } from "./services/gemini.js";
import { enrichPiecesWithImages } from "./services/rebrickable.js";
import {
  loadInventory,
  saveInventory,
  addPiecesToInventory,
  clearInventory,
} from "./services/inventory.js";
import { exportSpreadsheet, generateCatalogHTML } from "./services/exportService.js";

const DEFAULT_SETTINGS = {
  geminiKey: "AIzaSyCM1wvsh7bJ8TX8AY0w5iOUsyMa4vArwQA",
  rebrickableKey: "cdecb1729a83aa2366b8344a3b573427",
  darkMode: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem("lego_settings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export default function App() {
  const [view, setView] = useState("dashboard"); // dashboard | upload | analyzing | review | catalog | settings
  const [inventory, setInventory] = useState(loadInventory());
  const [settings, setSettings] = useState(loadSettings());
  const [analysisResult, setAnalysisResult] = useState(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  function handleSettingsSave(newSettings) {
    setSettings(newSettings);
    localStorage.setItem("lego_settings", JSON.stringify(newSettings));
    setView("dashboard");
  }

  async function handlePhotosReady(photos) {
    setView("analyzing");
    setError(null);

    try {
      let allPieces = [];
      let lastNotes = "";
      let lastPhotoUrl = null;

      for (let i = 0; i < photos.length; i++) {
        setProgress(`Analyzing photo ${i + 1} of ${photos.length}...`);

        const base64 = await fileToBase64(photos[i].file);
        lastPhotoUrl = photos[i].preview;

        const result = await analyzePhoto(settings.geminiKey, base64, photos[i].file.type);
        // Tag pieces with photo source
        const tagged = result.pieces.map((p) => ({
          ...p,
          photo_source: photos[i].name,
        }));
        allPieces = [...allPieces, ...tagged];
        lastNotes = result.notes;
      }

      // Enrich with Rebrickable images
      if (settings.rebrickableKey) {
        setProgress("Looking up part images...");
        allPieces = await enrichPiecesWithImages(settings.rebrickableKey, allPieces);
      }

      setAnalysisResult({ pieces: allPieces, notes: lastNotes });
      setCurrentPhotoUrl(lastPhotoUrl);
      setView("review");
    } catch (err) {
      setError(err.message);
      setView("upload");
    }
  }

  function handleSaveToInventory(pieces) {
    const photoName = pieces[0]?.photo_source || "photo";
    const updated = addPiecesToInventory(pieces, photoName);
    setInventory(updated);
    setAnalysisResult(null);
    setView("dashboard");
  }

  function handleExport() {
    exportSpreadsheet(inventory.pieces);
  }

  function handleViewCatalog() {
    setView("catalog");
  }

  function handleExportCatalogPDF() {
    const html = generateCatalogHTML(inventory.pieces);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  }

  function handleClear() {
    if (window.confirm("Clear all inventory data? This cannot be undone.")) {
      const cleared = clearInventory();
      setInventory(cleared);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 onClick={() => setView("dashboard")}>
            <span className="logo-brick">🧱</span> LEGO Inventory
          </h1>
        </div>
        <button className="btn-icon" onClick={() => setView("settings")}>
          ⚙️
        </button>
      </header>

      <main>
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {view === "dashboard" && (
          <Dashboard
            pieces={inventory.pieces}
            onUpload={() => setView("upload")}
            onExport={handleExport}
            onCatalog={handleViewCatalog}
            onClear={handleClear}
          />
        )}

        {view === "upload" && (
          <PhotoUpload onPhotosReady={handlePhotosReady} />
        )}

        {view === "analyzing" && (
          <div className="analyzing">
            <div className="spinner-large" />
            <p className="analyzing-text">{progress}</p>
            <p className="analyzing-hint">This may take 15-30 seconds per photo</p>
          </div>
        )}

        {view === "review" && analysisResult && (
          <ReviewEditor
            pieces={analysisResult.pieces}
            photoUrl={currentPhotoUrl}
            notes={analysisResult.notes}
            onSave={handleSaveToInventory}
            onCancel={() => {
              setAnalysisResult(null);
              setView("dashboard");
            }}
          />
        )}

        {view === "catalog" && (
          <VisualCatalog
            pieces={inventory.pieces}
            onBack={() => setView("dashboard")}
          />
        )}

        {view === "settings" && (
          <Settings
            settings={settings}
            onSave={handleSettingsSave}
            onBack={() => setView("dashboard")}
          />
        )}
      </main>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip data URL prefix
      const result = reader.result.split(",")[1];
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
