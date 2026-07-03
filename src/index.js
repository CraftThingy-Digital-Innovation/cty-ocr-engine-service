import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

import { initOcrService, performOcr } from './ocr-service.js';
import { getPdfPageCount, convertPdfPageToImage } from './pdf-service.js';
import { createJob, updateJobStatus, updateJobProgress, getJob } from './job-store.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
fs.mkdirSync('uploads', { recursive: true });

// Configure Multer for local file uploading
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // Limit files to 100MB
  }
});

app.use(express.json());

// Warm up the PaddleOCR model on startup
initOcrService().catch(err => {
  console.error('Failed to warm up OCR service on startup. It will try again on the first request:', err.message);
});

/**
 * Helper to process the OCR queue in the background
 */
async function runBackgroundOcr(jobId, filePath, isPdf, totalPages) {
  try {
    updateJobStatus(jobId, 'processing');

    if (isPdf) {
      for (let i = 1; i <= totalPages; i++) {
        console.log(`[Job ${jobId}] Processing page ${i}/${totalPages}...`);
        
        // 1. Render PDF page to image buffer
        const pageBuffer = await convertPdfPageToImage(filePath, i);
        
        // 2. Perform OCR and layout detection on the page buffer
        const ocrResult = await performOcr(pageBuffer);
        
        // 3. Save progress and append page results
        updateJobProgress(jobId, i, {
          page: i,
          text: ocrResult.text,
          lines: ocrResult.lines
        });
      }
    } else {
      // It's a single image
      console.log(`[Job ${jobId}] Processing single image...`);
      const ocrResult = await performOcr(filePath);
      updateJobProgress(jobId, 1, {
        page: 1,
        text: ocrResult.text,
        lines: ocrResult.lines
      });
    }
    
    console.log(`[Job ${jobId}] Finished successfully.`);
  } catch (error) {
    console.error(`[Job ${jobId}] Error during background processing:`, error);
    updateJobStatus(jobId, 'failed', error.message || 'Unknown processing error');
  } finally {
    // Clean up uploaded source file
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to delete upload source file:', e); }
    }
  }
}

// 1. Asynchronous Upload Endpoint (accepts PDFs or Images)
app.post('/api/ocr/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { path: filePath, originalname } = req.file;
    const isPdf = originalname.toLowerCase().endsWith('.pdf');
    const jobId = uuidv4();

    console.log(`Received file: ${originalname} (${req.file.size} bytes). Generating jobId: ${jobId}`);

    // If PDF, parse total page count first
    let totalPages = 1;
    if (isPdf) {
      try {
        totalPages = await getPdfPageCount(filePath);
      } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Failed to read PDF pages. Make sure file is not corrupted.' });
      }
    }

    // Save job track in database
    createJob(jobId, totalPages);

    // Trigger background process without awaiting (async)
    runBackgroundOcr(jobId, filePath, isPdf, totalPages);

    // Immediately respond with 202 Accepted
    return res.status(202).json({
      message: 'File upload accepted and queue started.',
      jobId,
      statusUrl: `/api/ocr/status/${jobId}`,
      totalPages
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// 2. Poll Status Endpoint
app.get('/api/ocr/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: `Job with ID ${jobId} not found.` });
  }

  return res.json(job);
});

// 3. Synchronous Endpoint (optimized for quick, single-page images)
app.post('/api/ocr/sync', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { path: filePath, originalname } = req.file;
  const isPdf = originalname.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'PDF processing is not supported in the sync endpoint. Please use /api/ocr/upload.' });
  }

  try {
    console.log(`Sync OCR request received for image: ${originalname}`);
    const result = await performOcr(filePath);
    return res.json({
      success: true,
      text: result.text,
      lines: result.lines
    });
  } catch (err) {
    console.error('Sync OCR error:', err);
    return res.status(500).json({ error: 'Failed to run OCR: ' + err.message });
  } finally {
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`OCR Engine Service is running at http://localhost:${PORT}`);
});
