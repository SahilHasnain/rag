import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'jobs.db');

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: 'pdf_indexing';
  status: JobStatus;
  progress: number; // 0-100
  totalChunks?: number;
  processedChunks?: number;
  message?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

let db: Database.Database | null = null;

function getDB() {
  if (db) return db;

  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Create jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      totalChunks INTEGER,
      processedChunks INTEGER DEFAULT 0,
      message TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      completedAt INTEGER
    )
  `);

  return db;
}

export function createJob(type: 'pdf_indexing'): Job {
  const db = getDB();
  const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();

  const job: Job = {
    id,
    type,
    status: 'pending',
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(`
    INSERT INTO jobs (id, type, status, progress, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, type, 'pending', 0, now, now);

  return job;
}

export function getJob(id: string): Job | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
  return row || null;
}

export function updateJob(
  id: string,
  updates: Partial<Pick<Job, 'status' | 'progress' | 'message' | 'totalChunks' | 'processedChunks' | 'completedAt'>>
) {
  const db = getDB();
  const now = Date.now();

  const fields: string[] = ['updatedAt = ?'];
  const values: any[] = [now];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.progress !== undefined) {
    fields.push('progress = ?');
    values.push(updates.progress);
  }
  if (updates.message !== undefined) {
    fields.push('message = ?');
    values.push(updates.message);
  }
  if (updates.totalChunks !== undefined) {
    fields.push('totalChunks = ?');
    values.push(updates.totalChunks);
  }
  if (updates.processedChunks !== undefined) {
    fields.push('processedChunks = ?');
    values.push(updates.processedChunks);
  }
  if (updates.completedAt !== undefined) {
    fields.push('completedAt = ?');
    values.push(updates.completedAt);
  }

  values.push(id);

  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function getAllJobs(): Job[] {
  const db = getDB();
  return db.prepare('SELECT * FROM jobs ORDER BY createdAt DESC').all() as Job[];
}

export function deleteJob(id: string) {
  const db = getDB();
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
}
