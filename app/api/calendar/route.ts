import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import type { ApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const db = await getDb();
    
    // Construct optional date range query
    const query: any = {};
    if (startParam || endParam) {
      query.$and = [];
      if (startParam) {
        // Find events that end after or during startParam
        query.$and.push({ endDate: { $gte: startParam } });
      }
      if (endParam) {
        // Find events that start before or during endParam
        query.$and.push({ startDate: { $lte: endParam } });
      }
    }

    const events = await db
      .collection('calendar_events')
      .find(query)
      .sort({ startDate: 1 })
      .toArray();

    // Map MongoDB _id to string id
    const data = events.map((event) => ({
      ...event,
      id: event._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json({ success: true, data } as ApiResponse<typeof data>);
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user - must be logged in
    await requireAuth();

    const body = await request.json();
    const { title, description, startDate, endDate, allDay = false, category, color } = body;

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Event title is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    if (!startDate) {
      return NextResponse.json(
        { success: false, error: 'Start date is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    if (!endDate) {
      return NextResponse.json(
        { success: false, error: 'End date is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Start date must be before end date' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const db = await getDb();
    const eventDoc = {
      title: title.trim(),
      description: description?.trim() || '',
      startDate,
      endDate,
      allDay: Boolean(allDay),
      category: category?.trim() || 'General',
      color: color?.trim() || '#3b82f6', // default tailwind blue-500
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await db.collection('calendar_events').insertOne(eventDoc);
    
    const data = {
      ...eventDoc,
      id: result.insertedId.toString(),
    };

    return NextResponse.json({ success: true, data } as ApiResponse<typeof data>);
  } catch (error: any) {
    console.error('Calendar POST error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' } as ApiResponse<null>,
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
