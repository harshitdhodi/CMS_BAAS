import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { NextResponse } from 'next/server';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Get allowed MIME types based on field type
export function getAllowedMimeTypes(fieldType) {
  switch (fieldType?.toLowerCase()) {
    case 'image':
      return [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
      ];
    case 'file':
      return [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Videos
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'video/x-matroska',
        // Audio
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/webm',
        // Text
        'text/plain',
        'text/csv',
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-tar',
        'application/gzip',
      ];
    default:
      return [];
  }
}

// Generate unique filename
export function generateFilename(file) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const ext = file.name.split('.').pop() || '';
  const filename = `${timestamp}-${randomStr}.${ext}`;
  return filename;
}

// Save file to local storage
export async function saveFileToLocal(file, filename) {
  await ensureUploadDir();
  const filepath = join(UPLOAD_DIR, filename);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

// Error handling wrapper
export function formatError(error) {
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
