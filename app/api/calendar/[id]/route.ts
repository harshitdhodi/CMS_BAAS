import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import type { ApiResponse } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    await requireAuth();

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, startDate, endDate, allDay, category, color } = body;

    const db = await getDb();
    
    // Check if the event exists
    const objectId = new ObjectId(id);
    const existingEvent = await db.collection('calendar_events').findOne({ _id: objectId });
    
    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Build the update document dynamically
    const updateDoc: any = {};
    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json(
          { success: false, error: 'Title cannot be empty' } as ApiResponse<null>,
          { status: 400 }
        );
      }
      updateDoc.title = title.trim();
    }
    if (description !== undefined) updateDoc.description = description?.trim() || '';
    if (startDate !== undefined) updateDoc.startDate = startDate;
    if (endDate !== undefined) updateDoc.endDate = endDate;
    if (allDay !== undefined) updateDoc.allDay = Boolean(allDay);
    if (category !== undefined) updateDoc.category = category?.trim() || 'General';
    if (color !== undefined) updateDoc.color = color?.trim() || '#3b82f6';
    
    updateDoc.updated_at = new Date().toISOString();

    // Check date logic if dates are updated
    const finalStartDate = startDate !== undefined ? startDate : existingEvent.startDate;
    const finalEndDate = endDate !== undefined ? endDate : existingEvent.endDate;
    if (new Date(finalStartDate) > new Date(finalEndDate)) {
      return NextResponse.json(
        { success: false, error: 'Start date must be before end date' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    await db.collection('calendar_events').updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    const updatedEvent = await db.collection('calendar_events').findOne({ _id: objectId });
    const data = updatedEvent
      ? { ...updatedEvent, id: updatedEvent._id.toString(), _id: undefined }
      : null;

    return NextResponse.json({ success: true, data } as ApiResponse<typeof data>);
  } catch (error: any) {
    console.error('Calendar PATCH error:', error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    await requireAuth();

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const db = await getDb();
    const objectId = new ObjectId(id);
    
    const result = await db.collection('calendar_events').deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' } as ApiResponse<null>);
  } catch (error: any) {
    console.error('Calendar DELETE error:', error);
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
