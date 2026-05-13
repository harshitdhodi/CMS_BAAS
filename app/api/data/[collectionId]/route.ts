import { NextRequest, NextResponse } from 'next/server';
import { createRecord, getCollectionFields, getRecords, getCollection, getCollectionByName } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    await requireAuth();
    const { collectionId } = await params;

    // Resolve collection name: if it's an ObjectId, get the collection by ID to get its name
    let collectionName = collectionId;
    let actualCollectionId = collectionId;
    if (ObjectId.isValid(collectionId)) {
      const { data: collection } = await getCollection(collectionId);
      if (!collection) {
        return NextResponse.json(
          { success: false, error: 'Collection not found' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      collectionName = collection.name;
      actualCollectionId = collection.id;
    } else {
      // If it's not an ObjectId, try to get by name to get the ID
      const { data: collection } = await getCollectionByName(collectionId);
      if (!collection) {
        return NextResponse.json(
          { success: false, error: 'Collection not found' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      actualCollectionId = collection.id;
    }

    const { data, error } = await getRecords(collectionName);
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch records' } as ApiResponse<null>,
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: true, data } as ApiResponse<typeof data>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Records GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    await requireAuth();
    const { collectionId } = await params;
    const payload = await request.json();

    // Resolve collection name: if it's an ObjectId, get the collection by ID to get its name
    let collectionName = collectionId;
    let actualCollectionId = collectionId;
    if (ObjectId.isValid(collectionId)) {
      const { data: collection } = await getCollection(collectionId);
      if (!collection) {
        return NextResponse.json(
          { success: false, error: 'Collection not found' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      collectionName = collection.name;
      actualCollectionId = collection.id;
    } else {
      // If it's not an ObjectId, try to get by name to get the ID
      const { data: collection } = await getCollectionByName(collectionId);
      if (!collection) {
        return NextResponse.json(
          { success: false, error: 'Collection not found' } as ApiResponse<null>,
          { status: 404 }
        );
      }
      actualCollectionId = collection.id;
    }

    // Basic required check against field definitions
    const { data: fields } = await getCollectionFields(actualCollectionId);
    if (fields) {
      for (const f of fields) {
        if (!f.is_required) continue;
        const v = payload[f.name];
        if (f.field_type === 'Array') {
          const isArray = Array.isArray(v);
          if (!isArray || v.length === 0) {
            return NextResponse.json(
              { success: false, error: `${f.display_name} is required (add at least one item)` } as ApiResponse<null>,
              { status: 400 }
            );
          }
        } else if (v === undefined || v === null || v === '') {
          return NextResponse.json(
            { success: false, error: `${f.display_name} is required` } as ApiResponse<null>,
            { status: 400 }
          );
        }
      }
    }

    const { data, error } = await createRecord(collectionName, payload);
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to create record' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data, message: 'Record created successfully' } as ApiResponse<typeof data>,
      { status: 201 }
    );
  } catch (error) {
    console.error('Records POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

