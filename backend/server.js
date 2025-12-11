import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';
import heicConvert from 'heic-convert';
import { promises as fsp } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS for local dev (adjust origin if needed)
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  })
);

// Directories
const uploadDir = path.join(__dirname, 'uploads');
const convertedDir = path.join(__dirname, 'converted');

// Ensure directories exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(convertedDir)) fs.mkdirSync(convertedDir);

// Multer config
const upload = multer({ dest: uploadDir });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Conversion route
app.post('/api/convert', upload.array('files'), async (req, res) => {
  const results = [];

  try {
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, ext);

      try {
        if (ext === '.heic' || ext === '.heif') {
          // HEIC → JPG using heic-convert (pure JS)
          const inputBuffer = await fsp.readFile(file.path);

          const outputBuffer = await heicConvert({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 0.9,
          });

          const outName = `${base}.jpg`;
          const outPath = path.join(convertedDir, outName);

          await fsp.writeFile(outPath, outputBuffer);

          results.push({
            type: 'image',
            originalName: file.originalname,
            convertedName: outName,
            url: `/converted/${outName}`,
          });
        } else if (ext === '.mov' || ext === '.qt') {
          // MOV → MP4 using ffmpeg
          const outName = `${base}.mp4`;
          const outPath = path.join(convertedDir, outName);

          await new Promise((resolve, reject) => {
            ffmpeg(file.path)
              .outputOptions(['-c:v libx264', '-c:a aac'])
              .on('end', resolve)
              .on('error', reject)
              .save(outPath);
          });

          results.push({
            type: 'video',
            originalName: file.originalname,
            convertedName: outName,
            url: `/converted/${outName}`,
          });
        } else {
          // Unsupported type
          results.push({
            type: 'unsupported',
            originalName: file.originalname,
            message: 'Only HEIC/HEIF and MOV files are supported',
          });
        }
      } catch (innerErr) {
        console.error('Error converting file:', file.originalname, innerErr);
        results.push({
          type: 'error',
          originalName: file.originalname,
          message: innerErr.message || 'Conversion error',
        });
      } finally {
        // Clean up temp upload file
        fs.unlink(file.path, () => {});
      }
    }

    res.json({ files: results });
  } catch (err) {
    console.error('Error in /api/convert handler:', err);
    res.status(500).json({ error: 'Conversion failed', details: err.message });
  }
});

// Serve converted files
app.use('/converted', express.static(convertedDir));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
