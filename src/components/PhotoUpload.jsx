import { useState, useRef } from "react";

export default function PhotoUpload({ onPhotosReady }) {
  const [photos, setPhotos] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  function handleFiles(files) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const newPhotos = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAnalyze() {
    if (photos.length > 0) onPhotosReady(photos);
  }

  return (
    <div className="upload-section">
      <div
        className={`drop-zone ${dragOver ? "dragover" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {photos.length === 0 ? (
          <div className="drop-prompt">
            <div className="drop-icon">📸</div>
            <p className="drop-title">Drop your LEGO photos here!</p>
            <p className="drop-hint">or tap to take a picture</p>
          </div>
        ) : (
          <div className="photo-grid-preview">
            {photos.map((photo, i) => (
              <div key={i} className="photo-thumb">
                <img src={photo.preview} alt={photo.name} />
                <button
                  className="remove-photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(i);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="add-more">
              <span>+ Add more</span>
            </div>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {photos.length > 0 && (
        <button className="btn-primary btn-large" onClick={handleAnalyze}>
          Find My LEGO Pieces! ({photos.length} photo{photos.length > 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
}
