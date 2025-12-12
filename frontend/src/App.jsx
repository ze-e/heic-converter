import { useState } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState([]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    addFiles(droppedFiles);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    // Filter to HEIC/HEIF/MOV only (optional)
    const accepted = newFiles.filter((f) =>
      /\.(heic|heif|mov|qt)$/i.test(f.name)
    );
    setFiles((prev) => [...prev, ...accepted]);
  };

const handleConvert = async () => {
  if (!files.length) return;

  setIsUploading(true);
  setResults([]);

  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));

  try {
    const res = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    setResults(data.files || []);

    // Reset the "Files to convert" list after successful conversion
    setFiles([]);
  } catch (err) {
    console.error(err);
    alert('Conversion failed. Check console for details.');
  } finally {
    setIsUploading(false);
  }
};


  const handleDownloadAll = () => {
    results
      .filter((r) => r.url && r.type !== 'unsupported')
      .forEach((fileResult) => {
        const link = document.createElement('a');
        link.href = fileResult.url;
        link.download = fileResult.convertedName || fileResult.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  };

  return (
    <div className="app">
      <h1>HEIC & MOV Converter</h1>
      <p>Convert HEIC → JPG and MOV → MP4 right in your browser.</p>

      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Drag & drop HEIC or MOV files here</p>
        <p>or</p>
        <label className="upload-button">
          Upload files
          <input
            type="file"
            multiple
            accept=".heic,.heif,.mov,.qt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <h2>Files to convert ({files.length})</h2>
          <ul>
            {files.map((file, idx) => (
              <li key={idx}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        className="convert-button"
        onClick={handleConvert}
        disabled={isUploading || files.length === 0}
      >
        {isUploading ? 'Converting…' : 'Convert & Download'}
      </button>

      {results.length > 0 && (
        <div className="results">
          <h2>Converted Files</h2>
          <button onClick={handleDownloadAll}>Download All</button>
      <ul>
        {results.map((r, idx) => (
          <li key={idx}>
            <strong>{r.originalName}</strong>{' '}
            {r.type === 'image' || r.type === 'video' ? (
              <>
                →{' '}
                <a href={r.url} download={r.convertedName}>
                  {r.convertedName}
                </a>
              </>
            ) : (
              <span className="error-text">
                — Conversion failed{r.message ? `: ${r.message}` : ''}
              </span>
            )}
          </li>
        ))}
      </ul>

        </div>
      )}
    </div>
  );
}

export default App;
