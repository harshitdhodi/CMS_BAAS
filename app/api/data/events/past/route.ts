import { NextRequest, NextResponse } from 'next/server';
import {
  getCollectionByName,
  getCollectionFields,
  getDb,
  normalizeDocId,
  populateRelationLabels,
  oid,
  resolveRelationCollectionName,
} from '@/lib/db';
import type { ApiResponse } from '@/lib/types';

/**
 * GET /api/data/events/past
 *
 * Returns events whose `date` field is < today (midnight UTC).
 * Results are sorted descending so the most recent past event comes first.
 */
export async function GET(request: NextRequest) {
  try {
    // Resolve the events collection
    const { data: collection } = await getCollectionByName('events');
    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Events collection not found' },
        { status: 404 }
      );
    }

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayIso = todayMidnight.toISOString(); // "2026-06-11T00:00:00.000Z"

    const db = await getDb();

    // Match documents where `date` field < today
    const docs = await db
      .collection(collection.name)
      .find({
        date: { $lt: todayIso },
      })
      .sort({ date: -1 }) // most recent past event first
      .toArray();

    const records = docs.map((d) => normalizeDocId(d as any));

    // Populate any Relation fields
    const { data: fields } = await getCollectionFields(collection.id);
    const populated = await populateRelationLabels(records, fields || []);

    // Deep-populate nested relations
    const result = await Promise.all(
      (populated || []).map((record: any) =>
        populateRecord(record, fields || [], collection.name, db)
      )
    );

    return NextResponse.json(
      { success: true, data: result } as ApiResponse<any>,
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET /api/data/events/past error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ── shared relation populator ──

async function populateRecord(
  record: any,
  fields: any[],
  collectionName: string,
  db: any
) {
  for (const field of fields) {
    if (
      field.field_type === 'Relation' &&
      field.relation_to_collection &&
      record[field.name]
    ) {
      try {
        const targetOid = oid(record[field.name]);
        if (!targetOid) continue;

        const targetCollectionName = await resolveRelationCollectionName(
          field.relation_to_collection
        );
        if (!targetCollectionName) continue;

        const relatedDoc = await db
          .collection(targetCollectionName)
          .findOne({ _id: targetOid });
        if (!relatedDoc) continue;

        const populated = normalizeDocId(relatedDoc);

        if (targetCollectionName === collectionName && populated[field.name]) {
          const gpOid = oid(populated[field.name]);
          if (gpOid) {
            const gpName = await resolveRelationCollectionName(
              field.relation_to_collection
            );
            if (gpName) {
              const gpDoc = await db
                .collection(gpName)
                .findOne({ _id: gpOid });
              if (gpDoc) {
                populated[`${field.name}_populated`] = normalizeDocId(gpDoc);
              }
            }
          }
        }

        record[`${field.name}_populated`] = populated;
      } catch {
        // ignore individual relation errors
      }
    }
  }
  return record;
}
