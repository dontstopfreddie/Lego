import { useState } from "react";

export default function Settings({ settings, onSave, onBack }) {
  const [form, setForm] = useState({ ...settings });

  function handleSave() {
    onSave(form);
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <button className="btn-secondary" onClick={onBack}>
          &larr; Back
        </button>
        <h2>Settings</h2>
      </div>

      <div className="settings-group">
        <label>Google Gemini API Key</label>
        <input
          type="password"
          value={form.geminiKey}
          onChange={(e) => setForm({ ...form, geminiKey: e.target.value })}
          placeholder="AIza..."
        />
        <p className="settings-hint">
          Free from Google AI Studio — no credit card needed
        </p>
      </div>

      <div className="settings-group">
        <label>Rebrickable API Key</label>
        <input
          type="password"
          value={form.rebrickableKey}
          onChange={(e) => setForm({ ...form, rebrickableKey: e.target.value })}
          placeholder="Your Rebrickable API key"
        />
        <p className="settings-hint">
          Free at rebrickable.com — used for part images and validation
        </p>
      </div>

      <div className="settings-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={form.darkMode}
            onChange={(e) => setForm({ ...form, darkMode: e.target.checked })}
          />
          <span>Dark Mode</span>
        </label>
      </div>

      <button className="btn-primary" onClick={handleSave}>
        Save Settings
      </button>
    </div>
  );
}
