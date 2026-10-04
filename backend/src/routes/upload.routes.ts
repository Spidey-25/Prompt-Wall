/**
 * Upload Routes — POST /api/upload
 *
 * Accepts .txt, .pdf, .md, .csv files from the browser.
 * Saves them into:
 *   1. python-engine/data/mock_files/   → immediately readable by read_file tool
 *   2. python-engine/data/              → available for RAG re-indexing
 *
 * GET /api/files → list files currently in the sandbox
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// ── Sandbox paths ─────────────────────────────────────────────────────────

const PYTHON_DATA_DIR = path.resolve(
  __dirname, '..', '..', '..', 'python-engine', 'data'
);
const MOCK_FILES_DIR = path.join(PYTHON_DATA_DIR, 'mock_files');
const RAG_DATA_DIR   = PYTHON_DATA_DIR;   // vendor_*.txt live here

// Ensure directories exist
fs.mkdirSync(MOCK_FILES_DIR, { recursive: true });

// ── Multer config ─────────────────────────────────────────────────────────

const ALLOWED_MIME = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/pdf',
  'application/octet-stream',  // .txt sent by some browsers
]);

const ALLOWED_EXT = new Set(['.txt', '.md', '.csv', '.pdf']);
const MAX_SIZE_MB  = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MOCK_FILES_DIR),
  filename: (_req, file, cb) => {
    // Sanitise filename: strip path chars, keep extension
    const safe = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${ext}' is not allowed. Use: .txt .md .csv .pdf`));
    }
  },
});

// ── POST /api/upload ──────────────────────────────────────────────────────

router.post('/upload', upload.array('files', 10), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({ success: false, error: 'No files received.' });
    return;
  }

  const saved: { name: string; size: number; path: string }[] = [];

  for (const file of files) {
    const sandboxPath = file.path; // already in mock_files/

    // Also copy .txt / .md to RAG data dir so it can be re-indexed later
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.txt' || ext === '.md') {
      const ragDest = path.join(RAG_DATA_DIR, file.filename);
      try { fs.copyFileSync(sandboxPath, ragDest); } catch (_) { /* non-fatal */ }
    }

    saved.push({
      name: file.filename,
      size: file.size,
      path: `data/mock_files/${file.filename}`,
    });
  }

  res.json({
    success: true,
    message: `${saved.length} file(s) uploaded and available to the agent.`,
    files: saved,
  });
});

// ── GET /api/files ────────────────────────────────────────────────────────

router.get('/files', (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(MOCK_FILES_DIR).map((name) => {
      const stats = fs.statSync(path.join(MOCK_FILES_DIR, name));
      return { name, size: stats.size, modified: stats.mtime.toISOString() };
    });
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
