'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PageRouteSelectorProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  collectionId: string;
  fieldName: string;
  recordId?: string;
}

export function PageRouteSelector({ value, onChange, required, collectionId, fieldName, recordId }: PageRouteSelectorProps) {
  const [routes, setRoutes] = useState<{ label: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoutes() {
      try {
        const url = new URL('/api/page-routes', window.location.origin);
        url.searchParams.set('collectionId', collectionId);
        url.searchParams.set('fieldName', fieldName);
        if (recordId) {
          url.searchParams.set('recordId', recordId);
        }
        
        const res = await fetch(url.toString());
        const json = await res.json();
        if (json.success) {
          setRoutes(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch page routes', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRoutes();
  }, []);

  return (
    <Select value={value} onValueChange={onChange} required={required} disabled={loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? 'Loading routes...' : 'Select a page route'} />
      </SelectTrigger>
      <SelectContent>
        {routes.map((route) => (
          <SelectItem key={route.value} value={route.value}>
            {route.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
