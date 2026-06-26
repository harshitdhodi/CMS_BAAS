import { NextRequest, NextResponse } from 'next/server';
import { getDb, oid } from '@/lib/db';
import type { Role, CreateRoleRequest, UpdateRoleRequest } from '@/lib/types';
import { SIDEBAR_PERMISSIONS } from '@/lib/types';

// GET /api/roles - Get all roles
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const col = db.collection('roles');
    
    const docs = await col.find({}).toArray();
    const roles = docs.map((d: any) => ({
      id: d._id.toString(),
      name: d.name,
      description: d.description,
      permissions: d.permissions || [],
      created_at: d.created_at,
      updated_at: d.updated_at,
    }));

    return NextResponse.json({ success: true, data: roles });
  } catch (err) {
    console.error('roles GET error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/roles - Create a new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions } = body as CreateRoleRequest;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate permissions — allow static SIDEBAR_PERMISSIONS and dynamic folder:* keys
    if (permissions) {
      const invalidPermissions = permissions.filter(
        p => !SIDEBAR_PERMISSIONS.includes(p as any) && !p.startsWith('folder:')
      );
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { success: false, error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const db = await getDb();
    const col = db.collection('roles');
    const now = new Date().toISOString();

    const doc = {
      name: name.trim(),
      description: description?.trim() || '',
      permissions: permissions || [],
      created_at: now,
      updated_at: now,
    };

    const result = await col.insertOne(doc);
    const newRole: Role = {
      id: result.insertedId.toString(),
      name: doc.name,
      description: doc.description,
      permissions: doc.permissions,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };

    return NextResponse.json({ success: true, data: newRole }, { status: 201 });
  } catch (err) {
    console.error('roles POST error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/roles - Update a role
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, permissions } = body as UpdateRoleRequest & { id: string };

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Validate permissions — allow static SIDEBAR_PERMISSIONS and dynamic folder:* keys
    if (permissions) {
      const invalidPermissions = permissions.filter(
        p => !SIDEBAR_PERMISSIONS.includes(p as any) && !p.startsWith('folder:')
      );
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { success: false, error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const db = await getDb();
    const col = db.collection('roles');
    const now = new Date().toISOString();

    const objectId = oid(id);
    if (!objectId) {
      return NextResponse.json({ success: false, error: 'Invalid role ID' }, { status: 400 });
    }

    const updateDoc: any = { updated_at: now };
    if (name !== undefined) updateDoc.name = name.trim();
    if (description !== undefined) updateDoc.description = description?.trim() || '';
    if (permissions !== undefined) updateDoc.permissions = permissions;

    const result = await col.updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    const updatedDoc = await col.findOne({ _id: objectId });
    if (!updatedDoc) {
      return NextResponse.json({ success: false, error: 'Role not found after update' }, { status: 404 });
    }

    const role: Role = {
      id: updatedDoc._id.toString(),
      name: updatedDoc.name,
      description: updatedDoc.description,
      permissions: updatedDoc.permissions,
      created_at: updatedDoc.created_at,
      updated_at: updatedDoc.updated_at,
    };

    return NextResponse.json({ success: true, data: role });
  } catch (err) {
    console.error('roles PUT error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/roles - Delete a role
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const col = db.collection('roles');

    // Check if role is being used by any users
    const usersCol = db.collection('users');
    const usersWithRole = await usersCol.countDocuments({ role_id: id });

    if (usersWithRole > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete role that is assigned to users' },
        { status: 400 }
      );
    }

    const objectId = oid(id);
    if (!objectId) {
      return NextResponse.json({ success: false, error: 'Invalid role ID' }, { status: 400 });
    }

    const result = await col.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Role deleted' });
  } catch (err) {
    console.error('roles DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
