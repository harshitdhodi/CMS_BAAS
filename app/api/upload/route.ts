import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import {
  getAllowedMimeTypes,
  generateFilename,
  saveFileToLocal,
  formatError,
} from './multerConfig';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fieldType = formData.get('fieldType') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Validate file type based on field type
    const allowedTypes = getAllowedMimeTypes(fieldType);
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `File type ${file.type} not allowed for ${fieldType} field. Allowed types: ${allowedTypes.join(', ')}`,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop() || '';
    const filename = `${timestamp}-${randomStr}.${ext}`;

    const bytes = await file.arrayBuffer();

    // Save file locally to public/uploads
    await ensureUploadDir();
    const filepath = join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);
    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          url: publicUrl,
          filename: file.name,
          size: file.size,
          type: file.type,
        },
        message: 'File uploaded successfully',
      } as ApiResponse<any>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = formatError(error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<null>,
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: errorMessage } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
