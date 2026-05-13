import { NextRequest, NextResponse } from 'next/server';
import { deleteRecord, updateRecord, getCollection, getCollectionByName } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import { ObjectId } from 'mongodb';

async function resolveCollectionName(collectionId: string): Promise<{ collectionName: string; error?: string }> {
  let collectionName = collectionId;
  if (ObjectId.isValid(collectionId)) {
    const { data: collection } = await getCollection(collectionId);
    if (!collection) {
      return { collectionName: '', error: 'Collection not found' };
    }
    collectionName = collection.name;
  } else {
    const { data: collection } = await getCollectionByName(collectionId);
    if (!collection) {
      return { collectionName: '', error: 'Collection not found' };
    }
  }
  return { collectionName };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string; recordId: string }> }
) {
  try {
    await requireAuth();
    const { collectionId, recordId } = await params;
    const payload = await request.json();

    const { collectionName, error } = await resolveCollectionName(collectionId);
    if (error) {
      return NextResponse.json(
        { success: false, error } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { data, error: updateError } = await updateRecord(collectionName, recordId, payload);
    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update record' } as ApiResponse<null>,
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: true, data, message: 'Record updated successfully' } as ApiResponse<typeof data>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Records PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ collectionId: string; recordId: string }> }
) {
  try {
    await requireAuth();
    const { collectionId, recordId } = await params;

    const { collectionName, error } = await resolveCollectionName(collectionId);
    if (error) {
      return NextResponse.json(
        { success: false, error } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { error: deleteError } = await deleteRecord(collectionName, recordId);
    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete record' } as ApiResponse<null>,
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: true, message: 'Record deleted successfully' } as ApiResponse<null>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Records DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

