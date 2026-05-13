import { NextRequest, NextResponse } from 'next/server';
import { getCollectionByName, getCollection, getCollectionFields, createRecord, getRecords } from '@/lib/db';
import { validateRecord } from '@/lib/validation-engine';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionName: string }> }
) {
  try {
    const { collectionName: identifier } = await params;
    const { searchParams } = new URL(request.url);
    const queryName = searchParams.get('collection');

    // 1. Resolve collection metadata (Prioritize Query Name -> Path Name -> Path ID)
    let collection = null;
    
    if (queryName) {
      const { data } = await getCollectionByName(queryName);
      collection = data;
    }

    if (!collection) {
      const { data } = await getCollectionByName(identifier);
      collection = data;
    }

    if (!collection) {
      const { data: byId } = await getCollection(identifier);
      collection = byId;
    }

    if (!collection) {
      return NextResponse.json({ success: false, error: `Collection '${queryName || identifier}' not found.` } as ApiResponse<null>, { status: 404 });
    }

    // Always use collection.name (the slug) for DB operations
    const { data, error } = await getRecords(collection.name);
    
    if (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) } as ApiResponse<null>, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collectionName: string }> }
) {
  try {
    const { collectionName: identifier } = await params;
    const { searchParams } = new URL(request.url);
    const queryName = searchParams.get('collection');
    
    // 1. Resolve collection metadata (Prioritize Query Name -> Path Name -> Path ID)
    let collection = null;

    if (queryName) {
      const { data } = await getCollectionByName(queryName);
      collection = data;
    }

    if (!collection) {
      const { data } = await getCollectionByName(identifier);
      collection = data;
    }

    if (!collection) {
      const { data: byId } = await getCollection(identifier);
      collection = byId;
    }

    if (!collection) {
      return NextResponse.json(
        { success: false, error: `Collection '${queryName || identifier}' not found.` },
        { status: 404 }
      );
    }

    // 2. Fetch field definitions (the schema) for this collection
    const { data: fields, error: fieldError } = await getCollectionFields(collection.id);
    if (fieldError) {
      return NextResponse.json({ success: false, error: 'Could not fetch schema fields.' }, { status: 500 });
    }

    // 3. Parse and validate incoming data
    const body = await request.json();
    const validation = validateRecord(body, fields || []);
    
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', data: validation.errors },
        { status: 400 }
      );
    }

    // 4. Save to the separate physical collection using the 'name' field (e.g., hero_section)
    const { data: result, error: saveError } = await createRecord(collection.name, body);
    
    if (saveError) {
      return NextResponse.json({ success: false, error: saveError instanceof Error ? saveError.message : String(saveError) }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result, message: 'Data saved successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Dynamic POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}