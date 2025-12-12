import { useState } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [uploadError, setUploadError] = useState('');

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
  const allowedExt = /\.(heic|heif|mov|qt)$/i;

  const accepted = [];
  const rejected = [];

  for (const f of newFiles) {
    if (allowedExt.test(f.name)) accepted.push(f);
    else rejected.push(f);
  }

  setFiles((prev) => {
    const makeKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
    const existingKeys = new Set(prev.map(makeKey));

    const uniqueAccepted = [];
    const duplicateNames = [];

    for (const f of accepted) {
      const key = makeKey(f);
      if (existingKeys.has(key)) {
        duplicateNames.push(f.name);
      } else {
        existingKeys.add(key);
        uniqueAccepted.push(f);
      }
    }

    // If everything in this batch was valid but all were duplicates, show a helpful message
    if (accepted.length > 0 && uniqueAccepted.length === 0 && rejected.length === 0) {
      const shown = duplicateNames.slice(0, 5);
      const more = Math.max(0, duplicateNames.length - shown.length);
      setUploadError(
        `Duplicate file(s) ignored: ${shown.join(', ')}${more ? ` (and ${more} more)` : ''}.`
      );
    } else if (rejected.length) {
      // Unsupported types message (takes priority)
      const rejectedNames = rejected.map((f) => f.name).slice(0, 5);
      const moreCount = Math.max(0, rejected.length - rejectedNames.length);
      setUploadError(
        `Unsupported file type: ${rejectedNames.join(', ')}${
          moreCount ? ` (and ${moreCount} more)` : ''
        }. Please upload HEIC/HEIF or MOV files.`
      );
    } else if (duplicateNames.length) {
      // Valid files were added, but some duplicates were ignored
      const shown = duplicateNames.slice(0, 5);
      const more = Math.max(0, duplicateNames.length - shown.length);
      setUploadError(
        `Some duplicate file(s) were ignored: ${shown.join(', ')}${more ? ` (and ${more} more)` : ''}.`
      );
    } else {
      // All good: clear error
      setUploadError('');
    }

    return [...prev, ...uniqueAccepted];
  });
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
    setUploadError('');
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
      <p>Convert iPhone file formats to more friendly file formats with the click of a button! No sign-up required!</p>

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

      {uploadError && <div className="error-banner">{uploadError}</div>}

{files.length > 0 && (
  <div className="file-list">
    <h2>Files to convert ({files.length})</h2>
    <ul>
      {files.map((file, idx) => (
        <li key={idx} className="file-item">
          <span className="file-name">{file.name}</span>
          <button
            className="remove-file"
            onClick={() =>
              setFiles((prev) => prev.filter((_, i) => i !== idx))
            }
            aria-label={`Remove ${file.name}`}
          >
            ×
          </button>
        </li>
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
      <footer className="copyright">
        © {new Date().getFullYear()} Z Rex Rodriguez
      </footer>
    </div>
  );
}

export default App;
