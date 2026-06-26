'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, Plus, Pencil, Trash2, Loader2, Check, Folder } from 'lucide-react';
import { SIDEBAR_PERMISSIONS } from '@/lib/types';
import type { Role } from '@/lib/types';

// Static permission labels
const STATIC_PERMISSION_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'collections': 'Collections',
  'color-manager': 'Color Manager',
  'page-manager': 'Page Manager',
  'calendar': 'Calendar',
  'api-docs': 'API Docs',
  'email-templates': 'Email Templates',
  'send-email': 'Send Email',
  'settings': 'Global Settings',
  'seo-settings': 'SEO Settings',
  'pages-metadata': 'Pages Metadata',
  'seo-audit': 'SEO Audit',
  'redirects': 'Redirects',
  'global-presence': 'Global Presence',
  'folders': 'Sidebar Folders',
};

interface SidebarFolder {
  id: string;
  name: string;
}

export default function RoleManagerPage() {
  const { user, isSuperadmin } = useAuth();
  const { toast } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [folders, setFolders] = useState<SidebarFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchRoles();
    fetchFolders();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      const json = await res.json();
      if (json.success) {
        setRoles(json.data || []);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch roles', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/sidebar-folders');
      const json = await res.json();
      if (json.success) {
        setFolders(json.data || []);
      }
    } catch (err) {
      // silently ignore
    }
  };

  // Build combined permission list: static permissions + dynamic folder permissions
  const allPermissions = [
    ...SIDEBAR_PERMISSIONS.map((p) => ({
      key: p,
      label: STATIC_PERMISSION_LABELS[p] || p,
      isFolder: false,
    })),
    ...folders.map((f) => ({
      key: `folder:${f.id}`,
      label: f.name,
      isFolder: true,
    })),
  ];

  const getPermissionLabel = (permission: string) => {
    if (permission.startsWith('folder:')) {
      const folderId = permission.replace('folder:', '');
      const folder = folders.find((f) => f.id === folderId);
      return folder ? folder.name : permission;
    }
    return STATIC_PERMISSION_LABELS[permission] || permission;
  };

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [] });
    setIsDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setIsDialogOpen(true);
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Role name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const method = editingRole ? 'PUT' : 'POST';
      const payload = editingRole ? { ...formData, id: editingRole.id } : formData;

      const res = await fetch('/api/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast({ title: editingRole ? 'Role updated' : 'Role created' });
        setIsDialogOpen(false);
        fetchRoles();
      } else {
        throw new Error(json.error);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save role', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const res = await fetch(`/api/roles?id=${roleId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast({ title: 'Role deleted' });
        fetchRoles();
      } else {
        throw new Error(json.error);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete role', variant: 'destructive' });
    }
  };

  if (!isSuperadmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Access denied. Superadmin only.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8" />
            Role Management
          </h1>
          <p className="text-muted-foreground mt-2">Manage user roles and their permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Content Editor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Input
                  id="role-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this role"
                />
              </div>
              <div className="space-y-3">
                <Label>Permissions</Label>

                {/* Static permissions */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    App Sections
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {allPermissions
                      .filter((p) => !p.isFolder)
                      .map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePermission(key)}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                            ${formData.permissions.includes(key)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                            }
                          `}
                        >
                          <div className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center
                            ${formData.permissions.includes(key)
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border'
                            }
                          `}>
                            {formData.permissions.includes(key) && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-sm font-medium">{label}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Folder permissions */}
                {folders.length > 0 && (
                  <div className="space-y-1 mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Folder className="w-3 h-3" />
                      Sidebar Folders
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {allPermissions
                        .filter((p) => p.isFolder)
                        .map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => togglePermission(key)}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                              ${formData.permissions.includes(key)
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                              }
                            `}
                          >
                            <div className={`
                              w-5 h-5 rounded border-2 flex items-center justify-center
                              ${formData.permissions.includes(key)
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border'
                              }
                            `}>
                              {formData.permissions.includes(key) && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              <Folder className="w-3 h-3 text-muted-foreground" />
                              {label}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingRole ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No roles created yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first role to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="border rounded-lg p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {role.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1"
                      >
                        {permission.startsWith('folder:') && <Folder className="w-3 h-3" />}
                        {getPermissionLabel(permission)}
                      </span>
                    ))}
                    {role.permissions.length === 0 && (
                      <span className="text-sm text-muted-foreground">No permissions</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(role)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(role.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
