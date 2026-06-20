'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  BookOpen, 
  Briefcase, 
  Mail, 
  Palette, 
  Layout, 
  Calendar, 
  ChevronRight, 
  UserCheck,
  Send,
  Loader2
} from 'lucide-react';

interface DashboardStats {
  counts: {
    products: number;
    blogs: number;
    careerLeads: number;
    contactLeads: number;
  };
  links: {
    productsCollectionId: string | null;
    blogsCollectionId: string | null;
  };
  pages: Array<{
    name: string;
    totalComponents: number;
    activeComponents: number;
  }>;
  templates: Array<{
    id: string;
    name: string;
    subject: string;
    variables: string[];
    is_default: boolean;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [colors, setColors] = useState<any>(null);

  // Authentication guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch Stats and Colors in parallel
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [statsRes, colorsRes] = await Promise.all([
          fetch('/api/dashboard/stats').then(res => res.ok ? res.json() : { success: false }),
          fetch('/api/colors').then(res => res.ok ? res.json() : { success: false })
        ]);

        if (statsRes.success) {
          setStats(statsRes.data);
        }
        if (colorsRes.success) {
          setColors(colorsRes.data.colors);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium tracking-wide">
            Loading dashboard…
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Format current date
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Theme-Friendly Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Real-time overview of your website collections, page content, custom styling, and lead inquiries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
            <UserCheck className="w-3.5 h-3.5" />
            {user.role}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground border border-border/50">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Real-time Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Products */}
        <Card className="group relative flex flex-col gap-3 p-4 border bg-card hover:border-primary/30 hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-200">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ring-1 bg-primary/10 text-primary ring-primary/15">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                Products
              </p>
              <p className="text-2xl font-bold text-foreground mt-1.5 leading-none">
                {stats?.counts?.products ?? 0}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/80 mt-1 flex-grow">
            Active catalog items displayed in the product section.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
            <span className="text-[10px] text-muted-foreground/75 font-mono">our_products</span>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs font-medium gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => {
                if (stats?.links?.productsCollectionId) {
                  router.push(`/collections/${stats.links.productsCollectionId}?collectionName=our_products`);
                } else {
                  router.push('/');
                }
              }}
            >
              Open
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        {/* Blogs */}
        <Card className="group relative flex flex-col gap-3 p-4 border bg-card hover:border-primary/30 hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-200">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ring-1 bg-primary/10 text-primary ring-primary/15">
              <BookOpen className="w-4 h-4" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                Blog Posts
              </p>
              <p className="text-2xl font-bold text-foreground mt-1.5 leading-none">
                {stats?.counts?.blogs ?? 0}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/80 mt-1 flex-grow">
            Articles and updates published to the news block.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
            <span className="text-[10px] text-muted-foreground/75 font-mono">blog</span>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs font-medium gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => {
                if (stats?.links?.blogsCollectionId) {
                  router.push(`/collections/${stats.links.blogsCollectionId}?collectionName=blog`);
                } else {
                  router.push('/');
                }
              }}
            >
              Open
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        {/* Career Leads */}
        <Card className="group relative flex flex-col gap-3 p-4 border bg-card hover:border-primary/30 hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-200">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ring-1 bg-primary/10 text-primary ring-primary/15">
              <Briefcase className="w-4 h-4" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                Career Leads
              </p>
              <p className="text-2xl font-bold text-foreground mt-1.5 leading-none">
                {stats?.counts?.careerLeads ?? 0}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/80 mt-1 flex-grow">
            Submissions and CVs from candidate applications.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
            <span className="text-[10px] text-muted-foreground/75 font-mono">career_applications</span>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs font-medium gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => router.push('/career-leads')}
            >
              Open
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        {/* Contact Leads */}
        <Card className="group relative flex flex-col gap-3 p-4 border bg-card hover:border-primary/30 hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-200">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ring-1 bg-primary/10 text-primary ring-primary/15">
              <Mail className="w-4 h-4" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                Contact Leads
              </p>
              <p className="text-2xl font-bold text-foreground mt-1.5 leading-none">
                {stats?.counts?.contactLeads ?? 0}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/80 mt-1 flex-grow">
            General client inquiries and queries captured online.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
            <span className="text-[10px] text-muted-foreground/75 font-mono">contact_leads</span>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs font-medium gap-1 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => router.push('/contact-leads')}
            >
              Open
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Main Core Managers Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Color Manager Section */}
        <Card className="border bg-card flex flex-col justify-between hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05)] transition-all duration-200">
          <div>
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center gap-2 text-primary">
                <Palette className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-semibold">Color Manager</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Adjust site-wide color presets dynamically writing back to SCSS stylesheets.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-4 space-y-4">
              {colors ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    
                    {/* Primary swatch */}
                    <div className="flex items-center gap-2 bg-secondary/20 rounded-md p-1.5 border border-border/30">
                      <div 
                        className="w-4 h-4 rounded border border-border/50 shrink-0" 
                        style={{ backgroundColor: colors.theme?.primary || '#1e8a8a' }} 
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground font-bold leading-none uppercase">Primary</p>
                        <p className="text-[10px] font-mono font-bold truncate mt-0.5">{colors.theme?.primary || '#1e8a8a'}</p>
                      </div>
                    </div>

                    {/* Theme BG swatch */}
                    <div className="flex items-center gap-2 bg-secondary/20 rounded-md p-1.5 border border-border/30">
                      <div 
                        className="w-4 h-4 rounded border border-border/50 shrink-0" 
                        style={{ backgroundColor: colors.theme?.bg || '#d8e5e5' }} 
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground font-bold leading-none uppercase">Theme BG</p>
                        <p className="text-[10px] font-mono font-bold truncate mt-0.5">{colors.theme?.bg || '#d8e5e5'}</p>
                      </div>
                    </div>

                    {/* Dark BG swatch */}
                    <div className="flex items-center gap-2 bg-secondary/20 rounded-md p-1.5 border border-border/30">
                      <div 
                        className="w-4 h-4 rounded border border-border/50 shrink-0" 
                        style={{ backgroundColor: colors.theme?.bg3 || '#202e30' }} 
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground font-bold leading-none uppercase">BG Dark</p>
                        <p className="text-[10px] font-mono font-bold truncate mt-0.5">{colors.theme?.bg3 || '#202e30'}</p>
                      </div>
                    </div>

                    {/* Header Dark swatch */}
                    <div className="flex items-center gap-2 bg-secondary/20 rounded-md p-1.5 border border-border/30">
                      <div 
                        className="w-4 h-4 rounded border border-border/50 shrink-0" 
                        style={{ backgroundColor: colors.theme?.dark || '#0c1e21' }} 
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground font-bold leading-none uppercase">Dark Primary</p>
                        <p className="text-[10px] font-mono font-bold truncate mt-0.5">{colors.theme?.dark || '#0c1e21'}</p>
                      </div>
                    </div>

                    {/* Text Body swatch */}
                    <div className="flex items-center gap-2 bg-secondary/20 rounded-md p-1.5 border border-border/30">
                      <div 
                        className="w-4 h-4 rounded border border-border/50 shrink-0" 
                        style={{ backgroundColor: colors.text?.body || '#364e52' }} 
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground font-bold leading-none uppercase">Text Body</p>
                        <p className="text-[10px] font-mono font-bold truncate mt-0.5">{colors.text?.body || '#364e52'}</p>
                      </div>
                    </div>

                    {/* Heading swatch */}
                    <div className="flex items-center gap-2 bg-secondary/20 rounded-md p-1.5 border border-border/30">
                      <div 
                        className="w-4 h-4 rounded border border-border/50 shrink-0" 
                        style={{ backgroundColor: colors.heading?.primary || '#0c1e21' }} 
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground font-bold leading-none uppercase">Heading</p>
                        <p className="text-[10px] font-mono font-bold truncate mt-0.5">{colors.heading?.primary || '#0c1e21'}</p>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="py-8 text-center border border-dashed rounded-lg bg-primary/[0.02]">
                  <span className="text-xs text-muted-foreground">Color parameters are currently loading</span>
                </div>
              )}
            </CardContent>
          </div>

          <CardContent className="pt-0 pb-4">
            <Button 
              size="sm"
              className="w-full gap-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15" 
              onClick={() => router.push('/color-manager')}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Modify Palette configuration</span>
            </Button>
          </CardContent>
        </Card>

        {/* Page Manager Section */}
        <Card className="border bg-card flex flex-col justify-between hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05)] transition-all duration-200">
          <div>
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center gap-2 text-primary">
                <Layout className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-semibold">Page Manager</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Activate layout sections, component rules, and configure order on frontend pages.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-4">
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {stats?.pages && stats.pages.length > 0 ? (
                  stats.pages.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-md border border-border/40 bg-secondary/10">
                      <span className="text-xs font-bold text-foreground capitalize truncate max-w-[60%]">
                        {p.name.replace('-', ' ')}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {p.activeComponents}/{p.totalComponents} Active
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center border border-dashed rounded-lg bg-primary/[0.02]">
                    <span className="text-xs text-muted-foreground">No component configurations loaded.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </div>

          <CardContent className="pt-0 pb-4">
            <Button 
              size="sm"
              className="w-full gap-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15" 
              onClick={() => router.push('/page-manager')}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Modify layout elements</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Email Templates Section */}
      <Card className="border bg-card hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05)] transition-all duration-200">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Mail className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-semibold">Email Templates</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Manage automated system notifications, template parameters, and triggers.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs font-semibold border-border/80 hover:bg-secondary/40" 
                onClick={() => router.push('/send-email')}
              >
                <Send className="w-3 h-3 mr-1 text-muted-foreground" />
                <span>Send Email</span>
              </Button>
              <Button 
                size="sm" 
                className="h-7 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15" 
                onClick={() => router.push('/email-templates')}
              >
                <span>Edit Templates</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats?.templates && stats.templates.length > 0 ? (
              stats.templates.map((t) => (
                <div 
                  key={t.id} 
                  className="flex flex-col justify-between p-3.5 rounded-lg border border-border/50 bg-secondary/10 hover:border-primary/20 transition-all duration-200 group relative"
                >
                  {t.is_default && (
                    <span className="absolute top-2.5 right-2.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border border-border/40 px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                  
                  <div>
                    <h5 className="text-xs font-semibold text-foreground truncate max-w-[70%]">{t.name}</h5>
                    <p className="text-[10px] text-muted-foreground/80 font-mono truncate mt-1" title={t.subject}>
                      Subject: {t.subject}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40">
                    <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-wider leading-none mb-2">Variables</p>
                    <div className="flex flex-wrap gap-1">
                      {t.variables && t.variables.length > 0 ? (
                        t.variables.map((v, i) => (
                          <span key={i} className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/5 text-primary/80 border border-primary/10">
                            {`{{${v}}}`}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-muted-foreground/50 italic">No variables</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center border border-dashed rounded-lg bg-primary/[0.02]">
                <span className="text-xs text-muted-foreground">No automated templates available.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
