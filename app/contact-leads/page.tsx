'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RecordsTable } from '@/components/records-table';
import type { Field } from '@/lib/types';

interface ContactLead {
    id: string;
    created_at?: string;
    updated_at?: string;
    name?: string;
    email?: string;
    service_id?: string;
    message?: string;
    status?: string;
}

export default function ContactLeadsPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { toast } = useToast();

    const [fields, setFields] = useState<Field[]>([]);
    const [records, setRecords] = useState<ContactLead[]>([]);
    const [collectionId, setCollectionId] = useState<string>('');
    const [fetching, setFetching] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showSyncDialog, setShowSyncDialog] = useState(false);

    // ── Auth guard ────────────────────────────────────────────────────
    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    // ── Initial load ──────────────────────────────────────────────────
    useEffect(() => {
        if (user) {
            console.log('[page] fetching collections...');
            fetchCollections();
        }
    }, [user]);

    // ── Fetch collections ─────────────────────────────────────────────
    const fetchCollections = useCallback(async () => {
        try {
            const res = await fetch('/api/collections');
            const json = await res.json();
            console.log('[fetchCollections] json:', json);
            if (json.success) {
                const collection = json.data.find((c: any) => c.name === 'contact_leads');
                console.log('[fetchCollections] contact_leads collection:', collection);
                if (collection) {
                    setCollectionId(collection.id);
                    fetchFields(collection.id);
                    fetchRecords(collection.id);
                } else {
                    setShowSyncDialog(true);
                }
            }
        } catch (error) {
            console.error('Failed to fetch collections:', error);
        }
    }, []);

    // ── Fetch fields ──────────────────────────────────────────────────
    const fetchFields = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/fields?collection_id=${id}`);
            const json = await res.json();
            console.log('fetchFields-json', json);
            if (json.success) {
                const fieldList = json.data || [];
                setFields(fieldList);
                console.log('fields', fieldList.length, 'fields', fieldList);
            }
        } catch (error) {
            console.error('Failed to fetch fields:', error);
        }
    }, []);

    // ── Fetch records ─────────────────────────────────────────────────
    const fetchRecords = useCallback(async (_id: string) => {
        setFetching(true);
        try {
            const res = await fetch(`/api/contact`);
            const json = await res.json();
            console.log('fetchRecords-json', json);
            if (json.success) {
                const normalizedRecords = (json.data || []).map((record: any) => {
                    if (typeof record !== 'object' || record === null) return record;
                    const flatRecord: Record<string, any> = {};
                    Object.keys(record).forEach((key) => {
                        const value = record[key];
                        if (value && typeof value === 'object' && value.id !== undefined) {
                            flatRecord[key] = value.id;
                        } else {
                            flatRecord[key] = value;
                        }
                    });

                    // Use the human-readable service title if the data was populated by the API
                    if (record.service_id_populated?.title) {
                        flatRecord.service_id = record.service_id_populated.title;
                    }

                    return flatRecord;
                });
                console.log('normalizedRecords', normalizedRecords);
                setRecords(normalizedRecords);
            }
        } catch (error) {
            console.error('Failed to fetch records:', error);
        } finally {
            setFetching(false);
        }
    }, []);

    // ── Refresh ───────────────────────────────────────────────────────
    const refreshData = useCallback(() => {
        if (collectionId) {
            fetchFields(collectionId);
            fetchRecords(collectionId);
        }
    }, [collectionId, fetchFields, fetchRecords]);

    // ── Create collection + fields ────────────────────────────────────
    const handleCreateCollection = useCallback(async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'contact_leads',
                    display_name: 'Contact Leads',
                    description: 'Collected contact form submissions from the website',
                    icon: 'mail',
                    color: 'green',
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to create collection');

            const newId = json.data.id;
            setCollectionId(newId);
            toast({ title: 'Collection created successfully' });

            // Create fields
            const fieldsToCreate = [
                { name: 'name', display_name: 'Name', field_type: 'Text', is_required: true },
                { name: 'email', display_name: 'Email', field_type: 'Text', is_required: true, is_unique: true },
                { name: 'service_id', display_name: 'Service', field_type: 'Text' },
                { name: 'message', display_name: 'Message', field_type: 'Textarea' },
                {
                    name: 'status', display_name: 'Status', field_type: 'Dropdown',
                    dropdown_options: ['New', 'In Progress', 'Resolved', 'Closed'],
                },
            ];

            for (const field of fieldsToCreate) {
                await fetch('/api/fields', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ collection_id: newId, ...field }),
                });
            }

            toast({ title: 'Fields created successfully' });
            fetchFields(newId);
            fetchRecords(newId);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSyncing(false);
            setShowSyncDialog(false);
        }
    }, [toast, fetchFields, fetchRecords]);

    // ── Loading state ─────────────────────────────────────────────────
    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12 space-y-6 max-w-7xl">

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Plus className="w-5 h-5" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">Contact Leads</h2>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Manage and track all contact form submissions received through your website.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshData}
                    disabled={fetching}
                    className="gap-2 text-muted-foreground"
                >
                    <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
                    {fetching ? 'Refreshing...' : 'Refresh'}
                </Button>
            </div>

            {/* Collection missing */}
            {!collectionId && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <CardHeader>
                        <CardTitle className="text-amber-700 dark:text-amber-400">Collection Not Found</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            The <code>contact_leads</code> collection does not exist yet.
                        </p>
                        <Button onClick={handleCreateCollection} disabled={syncing} className="gap-2">
                            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {syncing ? 'Creating...' : 'Create contact_leads Collection'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Records + stats */}
            {collectionId && (
                <>
                    <RecordsTable
                        collectionId={collectionId}
                        fields={fields}
                        records={records}
                        title="Contact Submissions"
                        hiddenFieldNames={['message']}
                        onDelete={refreshData}
                        onUpdate={refreshData}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Leads', value: records.length, color: '' },
                            { label: 'New', value: records.filter(r => r.status === 'New' || !r.status).length, color: 'text-blue-600' },
                            { label: 'In Progress', value: records.filter(r => r.status === 'In Progress').length, color: 'text-yellow-600' },
                            { label: 'Resolved', value: records.filter(r => r.status === 'Resolved').length, color: 'text-green-600' },
                        ].map(({ label, value, color }) => (
                            <Card key={label}>
                                <CardContent className="pt-6">
                                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                                    <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            {/* Setup dialog */}
            <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Collection</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                        <Label>Collection Setup</Label>
                        <p className="text-sm text-muted-foreground">
                            Creates <code>contact_leads</code> with fields: name, email, service_id, message, status.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSyncDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateCollection} disabled={syncing}>
                            {syncing ? 'Creating...' : 'Create Collection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}