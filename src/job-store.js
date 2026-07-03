import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.resolve('jobs.db');
const db = new DatabaseSync(dbPath);

// Initialize the SQLite schema for tracking OCR jobs
db.exec(`
  CREATE TABLE IF NOT EXISTS ocr_jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    total_pages INTEGER DEFAULT 0,
    processed_pages INTEGER DEFAULT 0,
    results TEXT DEFAULT '[]', -- JSON string of parsed pages
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * Creates a new OCR tracking job in the database.
 * @param {string} jobId Unique UUID of the job
 * @param {number} totalPages Total number of pages to process
 */
export function createJob(jobId, totalPages = 0) {
  const statement = db.prepare(`
    INSERT INTO ocr_jobs (id, status, total_pages, processed_pages, results)
    VALUES (?, 'pending', ?, 0, '[]')
  `);
  statement.run(jobId, totalPages);
}

/**
 * Updates the high-level status of a job (e.g. failed or processing).
 * @param {string} jobId Unique UUID of the job
 * @param {string} status 'pending' | 'processing' | 'completed' | 'failed'
 * @param {string|null} errorMessage Optional error log if the job failed
 */
export function updateJobStatus(jobId, status, errorMessage = null) {
  const statement = db.prepare(`
    UPDATE ocr_jobs
    SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  statement.run(status, errorMessage, jobId);
}

/**
 * Updates progress by incrementing processed pages and appending the new page's OCR result.
 * @param {string} jobId Unique UUID of the job
 * @param {number} processedPages Cumulative count of processed pages
 * @param {object} pageResult The OCR result of the page, e.g. { page: 1, text: "...", lines: [...] }
 */
export function updateJobProgress(jobId, processedPages, pageResult) {
  const select = db.prepare('SELECT results, total_pages FROM ocr_jobs WHERE id = ?');
  const job = select.get(jobId);
  if (!job) return;

  const currentResults = JSON.parse(job.results || '[]');
  currentResults.push(pageResult);

  // Maintain page order ascending
  currentResults.sort((a, b) => a.page - b.page);

  const newStatus = processedPages >= job.total_pages ? 'completed' : 'processing';

  const update = db.prepare(`
    UPDATE ocr_jobs
    SET processed_pages = ?, results = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  update.run(processedPages, JSON.stringify(currentResults), newStatus, jobId);
}

/**
 * Retrieves a job status and parsed results.
 * @param {string} jobId Unique UUID of the job
 * @returns {object|null} The job object, or null if not found
 */
export function getJob(jobId) {
  const select = db.prepare('SELECT * FROM ocr_jobs WHERE id = ?');
  const job = select.get(jobId);
  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    total_pages: job.total_pages,
    processed_pages: job.processed_pages,
    results: JSON.parse(job.results || '[]'),
    error_message: job.error_message,
    created_at: job.created_at,
    updated_at: job.updated_at
  };
}
