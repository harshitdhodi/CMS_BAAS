import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const routes: { label: string; value: string }[] = [];

    // 1. Add static routes
    const staticRoutes = [
      '/',
      '/about-us',
      '/contact',
      '/blogs',
      '/services',
      '/categories',
      '/careers',
      '/events',
      '/global-presence',
      '/industry-solutions',
      '/manufacturing-infrastructure',
      '/products',
      '/quality-certification',
      '/team',
      '/terms-and-conditions'
    ];

    staticRoutes.forEach(route => {
      routes.push({ label: `Static: ${route === '/' ? 'Home' : route}`, value: route });
    });

    // 2. Add dynamic routes from known collections
    const dynamicMappings = [
      { collection: 'blog', pathPrefix: '/blogs', labelPrefix: 'Blog' },
      { collection: 'service', pathPrefix: '/services', labelPrefix: 'Service' },
      { collection: 'categories', pathPrefix: '/categories', labelPrefix: 'Category' },
      { collection: 'our_products', pathPrefix: '/products', labelPrefix: 'Product' },
      { collection: 'career-info', pathPrefix: '/careers', labelPrefix: 'Career' },
      { collection: 'events', pathPrefix: '/events', labelPrefix: 'Event' },
    ];

    for (const mapping of dynamicMappings) {
      try {
        const docs = await db.collection(mapping.collection).find({}, { projection: { slug: 1, title: 1, name: 1, display_name: 1 } }).toArray();
        docs.forEach(doc => {
          if (doc.slug) {
            const title = doc.title || doc.name || doc.display_name || doc.slug;
            routes.push({ 
              label: `${mapping.labelPrefix}: ${title}`, 
              value: `${mapping.pathPrefix}/${doc.slug}` 
            });
          }
        });
      } catch (err) {
        // Skip if collection doesn't exist
      }
    }
    
    // Check for our_team which might use ID
    try {
      const teamDocs = await db.collection('our_team').find({}, { projection: { _id: 1, name: 1 } }).toArray();
      teamDocs.forEach(doc => {
        routes.push({ 
          label: `Team: ${doc.name || doc._id.toString()}`, 
          value: `/team/${doc._id.toString()}` 
        });
      });
    } catch (err) {}

    // Filter out already used routes
    const searchParams = request.nextUrl.searchParams;
    const collectionId = searchParams.get('collectionId');
    const fieldName = searchParams.get('fieldName');
    const recordId = searchParams.get('recordId');

    let availableRoutes = routes;

    if (collectionId && fieldName) {
      try {
        const { oid } = require('@/lib/db');
        const collection = await db.collection('collections').findOne({ _id: oid(collectionId) });
        if (collection) {
          const query: any = { [fieldName]: { $exists: true, $ne: null } };
          if (recordId && oid(recordId)) {
            query._id = { $ne: oid(recordId) };
          }
          const usedRecords = await db.collection(collection.name).find(query, { projection: { [fieldName]: 1 } }).toArray();
          const usedSet = new Set(usedRecords.map(r => r[fieldName]));
          
          availableRoutes = routes.filter(r => !usedSet.has(r.value));
        }
      } catch (err) {
        console.error('Error filtering used routes', err);
      }
    }

    return NextResponse.json({ success: true, data: availableRoutes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
