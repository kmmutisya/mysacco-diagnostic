import { useState, useMemo, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Assessment } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  LayoutDashboard,
  Search,
  Filter,
  Users,
  CheckCircle2,
  FileText,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  Layers,
  Server,
  MonitorSmartphone,
  Cpu,
  Building2,
  CalendarDays,
  BadgePercent,
  KanbanSquare,
  ExternalLink,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Lock,
  LogOut,
  ShieldCheck,
  Clock,
  ChevronRight,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function modelLabel(model: string | null | undefined) {
  switch (model) {
    case "full_stack":     return "Full Stack";
    case "front_end_only": return "Front-End Only";
    case "back_end_only":  return "Back-End Only";
    default:               return "Pending";
  }
}
function modelIcon(model: string | null | undefined) {
  switch (model) {
    case "full_stack":     return <Layers className="h-3.5 w-3.5" />;
    case "front_end_only": return <MonitorSmartphone className="h-3.5 w-3.5" />;
    case "back_end_only":  return <Server className="h-3.5 w-3.5" />;
    default:               return <Cpu className="h-3.5 w-3.5" />;
  }
}
function modelColor(model: string | null | undefined) {
  switch (model) {
    case "full_stack":     return "bg-primary/10 text-primary border-primary/20";
    case "front_end_only": return "bg-blue-50 text-blue-700 border-blue-200";
    case "back_end_only":  return "bg-purple-50 text-purple-700 border-purple-200";
    default:               return "bg-muted text-muted-foreground border-border";
  }
}
function complexityColor(complexity: string | null | undefined) {
  switch (complexity) {
    case "standard":       return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "complex":        return "bg-amber-50 text-amber-700 border-amber-200";
    case "highly_complex": return "bg-red-50 text-red-700 border-red-200";
    default:               return "bg-muted text-muted-foreground border-border";
  }
}
function statusColor(status: string | null | undefined) {
  switch (status) {
    case "submitted": return "bg-blue-50 text-blue-700 border-blue-200";
    case "reviewed":  return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:          return "bg-amber-50 text-amber-700 border-amber-200";
  }
}
function formatKES(val: number | null | undefined) {
  if (!val) return "—";
  return `KES ${(val / 1000).toFixed(0)}K / yr`;
}
function formatDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}
function pwinColor(score: number | null | undefined) {
  if (!score) return "text-muted-foreground";
  if (score >= 70) return "text-emerald-600 font-bold";
  if (score >= 40) return "text-amber-600 font-semibold";
  return "text-red-500 font-semibold";
}

type SortKey = "createdAt" | "submittedAt" | "saccoName" | "pwinScore" | "estimatedRevenue" | "techProficiencyScore" | "accountingProficiencyScore";

// ─── Availability Slots display ──────────────────────────────────────────────

interface AvailabilitySlot {
  date: string;
  time: string;
  label: string;
}

function AvailabilitySlotsPanel({ assessment }: { assessment: Assessment }) {
  const slots: AvailabilitySlot[] = (() => {
    try { return JSON.parse((assessment as any).availabilitySlots || "[]"); } catch { return []; }
  })();

  if (slots.length === 0) return (
    <p className="text-xs text-muted-foreground italic">No availability slots selected yet.</p>
  );

  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((s) => (
        <span
          key={`${s.date}-${s.time}`}
          className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5"
        >
          <Clock className="h-3 w-3 flex-shrink-0" />
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ─── PIN Gate ────────────────────────────────────────────────────────────────

const SESSION_KEY = "msf_dashboard_token";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const verifyMutation = useMutation({
    mutationFn: (p: string) => apiRequest("POST", "/api/dashboard/verify", { pin: p }),
    onSuccess: async (res) => {
      const data = await res.json();
      // Store token in memory only (no localStorage)
      sessionToken = data.token;
      onUnlock();
    },
    onError: () => {
      setError("Incorrect PIN. Please contact your Safaricom presales manager.");
      setPin("");
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">Safaricom Staff Access</h1>
            <p className="text-sm text-muted-foreground mt-1">This dashboard is restricted to Safaricom presales staff. Enter your team PIN to continue.</p>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            type="password"
            placeholder="Enter team PIN"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(""); }}
            className="text-center tracking-widest font-mono text-lg h-12"
            data-testid="input-dashboard-pin"
            onKeyDown={(e) => e.key === "Enter" && pin && verifyMutation.mutate(pin)}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => verifyMutation.mutate(pin)}
            disabled={!pin || verifyMutation.isPending}
            data-testid="button-unlock-dashboard"
          >
            {verifyMutation.isPending ? "Verifying…" : "Access Dashboard"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          <Lock className="h-3 w-3 inline mr-1" />
          Safaricom MySACCO · Presales Platform · Confidential
        </p>
      </div>
    </div>
  );
}

// module-level in-memory token (not localStorage)
let sessionToken: string | null = null;

// ─── Edit Dialog ─────────────────────────────────────────────────────────────

interface EditDialogProps { assessment: Assessment; open: boolean; onClose: () => void }
function EditPresalesDialog({ assessment, open, onClose }: EditDialogProps) {
  const { toast } = useToast();
  const [model, setModel] = useState(assessment.recommendedModel || "full_stack");
  const [pwin, setPwin] = useState(String(assessment.pwinScore || ""));
  const [notes, setNotes] = useState(assessment.presalesNotes || "");
  const [nextSteps, setNextSteps] = useState(assessment.nextSteps || "");
  const [reviewedBy, setReviewedBy] = useState(assessment.reviewedBy || "");

  const mutation = useMutation({
    mutationFn: (data: Partial<Assessment>) => apiRequest("PATCH", `/api/assessments/${assessment.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({ title: "Saved", description: "Presales notes updated." });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-edit-presales">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" />
            Edit Presales Notes — {assessment.saccoName || assessment.accessCode}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Recommended Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger data-testid="select-model"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_stack">Full Stack (A+B) — KES 20,000/mo</SelectItem>
                <SelectItem value="front_end_only">Front-End Channels Only (A+C) — KES 10,000/mo</SelectItem>
                <SelectItem value="back_end_only">Back-End Platform Only (B) — KES 15,000/mo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>PWIN Score (0–100)</Label>
            <Input type="number" min={0} max={100} placeholder="e.g. 75" value={pwin} onChange={(e) => setPwin(e.target.value)} data-testid="input-pwin" />
          </div>
          <div className="space-y-1.5">
            <Label>Presales Notes / Reasoning</Label>
            <Textarea rows={4} placeholder="Rationale, risk factors…" value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="textarea-notes" />
          </div>
          <div className="space-y-1.5">
            <Label>Next Steps</Label>
            <Textarea rows={3} placeholder="Schedule demo, collect docs…" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} data-testid="textarea-nextsteps" />
          </div>
          <div className="space-y-1.5">
            <Label>Reviewed By</Label>
            <Input placeholder="Your name" value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} data-testid="input-reviewed-by" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ recommendedModel: model, pwinScore: pwin ? Number(pwin) : null, presalesNotes: notes, nextSteps, reviewedBy, status: "reviewed", reviewedAt: new Date().toISOString() } as any)} disabled={mutation.isPending} className="bg-primary hover:bg-primary/90">
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Dialog ────────────────────────────────────────────────────────────

function CreateAssessmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/assessments/create"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({ title: "Assessment Created", description: `Access code: ${data.accessCode}`, duration: 8000 });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Could not create.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />New Assessment
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Generates a unique code (e.g. <span className="font-mono font-medium text-foreground">MSC-AB3K7P</span>) to share with the SACCO contact.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-primary hover:bg-primary/90">
            {mutation.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirmDialog({ assessment, onClose }: { assessment: Assessment | null; onClose: () => void }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/assessments/${assessment!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({ title: "Deleted" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <AlertDialog open={!!assessment} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
          <AlertDialogDescription>
            Permanently delete the assessment for{" "}
            <span className="font-semibold text-foreground">{assessment?.saccoName || assessment?.accessCode}</span>. Cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 10 }: { score: number | null | undefined; max?: number }) {
  if (!score && score !== 0) return <span className="text-muted-foreground text-xs">—</span>;
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums">{score}/{max}</span>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground ml-0.5" />;
  return dir === "asc" ? <ChevronUp className="h-3 w-3 text-primary ml-0.5" /> : <ChevronDown className="h-3 w-3 text-primary ml-0.5" />;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [unlocked, setUnlocked] = useState(!!sessionToken);

  // Check module-level token on mount
  useEffect(() => {
    if (sessionToken) setUnlocked(true);
  }, []);

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return <DashboardContent onLock={() => { sessionToken = null; setUnlocked(false); }} />;
}

function DashboardContent({ onLock }: { onLock: () => void }) {
  const { data: assessments, isLoading, refetch } = useQuery<Assessment[]>({ queryKey: ["/api/assessments"] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [complexityFilter, setComplexityFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editTarget, setEditTarget] = useState<Assessment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const stats = useMemo(() => {
    if (!assessments) return null;
    return {
      total: assessments.length,
      submitted: assessments.filter((a) => a.status === "submitted" || a.status === "reviewed").length,
      reviewed: assessments.filter((a) => a.status === "reviewed").length,
      fullStack: assessments.filter((a) => a.recommendedModel === "full_stack").length,
      frontEnd: assessments.filter((a) => a.recommendedModel === "front_end_only").length,
      backEnd: assessments.filter((a) => a.recommendedModel === "back_end_only").length,
      totalRevenue: assessments.reduce((acc, a) => acc + (a.estimatedRevenue || 0), 0),
      highPwin: assessments.filter((a) => (a.pwinScore || 0) >= 70).length,
    };
  }, [assessments]);

  const filtered = useMemo(() => {
    if (!assessments) return [];
    let list = assessments.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (a.saccoName || "").toLowerCase().includes(q) || (a.accessCode || "").toLowerCase().includes(q) || (a.county || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const matchModel = modelFilter === "all" || a.recommendedModel === modelFilter || (!a.recommendedModel && modelFilter === "pending");
      const matchComplexity = complexityFilter === "all" || a.complexityRating === complexityFilter;
      return matchSearch && matchStatus && matchModel && matchComplexity;
    });
    return [...list].sort((a, b) => {
      let va: any = a[sortKey as keyof Assessment] || "";
      let vb: any = b[sortKey as keyof Assessment] || "";
      if (sortKey === "saccoName") { va = (a.saccoName || "").toLowerCase(); vb = (b.saccoName || "").toLowerCase(); }
      return va < vb ? (sortDir === "asc" ? -1 : 1) : va > vb ? (sortDir === "asc" ? 1 : -1) : 0;
    });
  }, [assessments, search, statusFilter, modelFilter, complexityFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function exportCsv() {
    if (!filtered.length) return;
    const headers = ["Code", "SACCO", "Status", "County", "Model", "Complexity", "PWIN", "Revenue", "Tech", "Accounting", "Submitted"];
    const rows = filtered.map((a) => [a.accessCode, a.saccoName || "", a.status, a.county || "", modelLabel(a.recommendedModel), a.complexityRating || "", a.pwinScore || "", a.estimatedRevenue || "", a.techProficiencyScore || "", a.accountingProficiencyScore || "", a.submittedAt ? formatDate(a.submittedAt) : ""]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mysacco-leads-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-dashboard">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bold text-sm text-foreground whitespace-nowrap">MySACCO Diagnostics</span>
            <span className="hidden sm:inline text-[10px] text-muted-foreground border rounded-full px-2 py-0.5 whitespace-nowrap">Safaricom Presales</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="hidden sm:flex gap-1.5 text-xs h-8"><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="hidden sm:flex gap-1.5 text-xs h-8" disabled={!filtered.length}><Download className="h-3.5 w-3.5" />Export CSV</Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90"><Plus className="h-3.5 w-3.5" />New Assessment</Button>
            <Link href="/"><Button variant="ghost" size="sm" className="text-xs h-8">← Home</Button></Link>
            <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground" onClick={onLock} title="Lock dashboard"><LogOut className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Leads", value: stats?.total ?? 0, icon: <Users className="h-4 w-4 text-primary" />, bg: "bg-primary/10", testid: "kpi-total" },
            { label: "Submitted", value: stats?.submitted ?? 0, icon: <FileText className="h-4 w-4 text-blue-600" />, bg: "bg-blue-50", testid: "kpi-submitted" },
            { label: "Reviewed", value: stats?.reviewed ?? 0, icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, bg: "bg-emerald-50", testid: "kpi-reviewed" },
            { label: "High PWIN (≥70)", value: stats?.highPwin ?? 0, icon: <BadgePercent className="h-4 w-4 text-amber-600" />, bg: "bg-amber-50", testid: "kpi-highpwin" },
          ].map((k) => (
            <Card key={k.label} className="border-border shadow-none">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                    <p className="text-2xl font-bold tabular-nums" data-testid={k.testid}>{isLoading ? "—" : k.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${k.bg}`}>{k.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Full Stack</p><p className="text-xl font-bold text-primary tabular-nums">{isLoading ? "—" : stats?.fullStack ?? 0}</p><p className="text-[10px] text-muted-foreground mt-0.5">KES 20,000/mo</p></CardContent></Card>
          <Card className="border-border shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Front-End Only</p><p className="text-xl font-bold text-blue-600 tabular-nums">{isLoading ? "—" : stats?.frontEnd ?? 0}</p><p className="text-[10px] text-muted-foreground mt-0.5">KES 10,000/mo</p></CardContent></Card>
          <Card className="border-border shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Back-End Only</p><p className="text-xl font-bold text-purple-600 tabular-nums">{isLoading ? "—" : stats?.backEnd ?? 0}</p><p className="text-[10px] text-muted-foreground mt-0.5">KES 15,000/mo</p></CardContent></Card>
          <Card className="border-border shadow-none bg-primary/5 border-primary/15"><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Est. Annual Revenue</p><p className="text-xl font-bold text-primary tabular-nums">{isLoading ? "—" : stats ? (stats.totalRevenue > 0 ? `KES ${(stats.totalRevenue / 1000).toFixed(0)}K` : "KES 0") : "—"}</p><p className="text-[10px] text-muted-foreground mt-0.5">Pipeline total</p></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search SACCO name, code, county…" className="pl-8 h-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32" data-testid="select-filter-status"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="reviewed">Reviewed</SelectItem></SelectContent>
            </Select>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="h-8 text-xs w-36"><KanbanSquare className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Models</SelectItem><SelectItem value="full_stack">Full Stack</SelectItem><SelectItem value="front_end_only">Front-End Only</SelectItem><SelectItem value="back_end_only">Back-End Only</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
            </Select>
            <Select value={complexityFilter} onValueChange={setComplexityFilter}>
              <SelectTrigger className="h-8 text-xs w-36"><AlertTriangle className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Complexity</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="complex">Complex</SelectItem><SelectItem value="highly_complex">Highly Complex</SelectItem></SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground ml-auto shrink-0">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Table */}
        <Card className="border-border shadow-none overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><RefreshCw className="h-5 w-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              {assessments?.length === 0 ? (
                <>
                  <LayoutDashboard className="h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-sm mb-1">No assessments yet</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mb-4">Create a new assessment to generate an access code for a SACCO lead.</p>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-primary hover:bg-primary/90 text-xs"><Plus className="h-3.5 w-3.5" />Create First</Button>
                </>
              ) : (
                <><Search className="h-8 w-8 text-muted-foreground mb-3" /><h3 className="font-semibold text-sm mb-1">No results</h3><p className="text-xs text-muted-foreground">Adjust your filters.</p></>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] uppercase tracking-wide bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-8" />
                    <TableHead className="w-32 font-semibold">Code</TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("saccoName")}><span className="flex items-center gap-0.5">SACCO<SortIcon active={sortKey === "saccoName"} dir={sortDir} /></span></TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Model</TableHead>
                    <TableHead className="font-semibold">Complexity</TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("techProficiencyScore")}><span className="flex items-center gap-0.5">Tech<SortIcon active={sortKey === "techProficiencyScore"} dir={sortDir} /></span></TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("accountingProficiencyScore")}><span className="flex items-center gap-0.5">Acctg<SortIcon active={sortKey === "accountingProficiencyScore"} dir={sortDir} /></span></TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("pwinScore")}><span className="flex items-center gap-0.5">PWIN<SortIcon active={sortKey === "pwinScore"} dir={sortDir} /></span></TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("estimatedRevenue")}><span className="flex items-center gap-0.5">Revenue<SortIcon active={sortKey === "estimatedRevenue"} dir={sortDir} /></span></TableHead>
                    <TableHead className="font-semibold cursor-pointer" onClick={() => toggleSort("submittedAt")}><span className="flex items-center gap-0.5">Submitted<SortIcon active={sortKey === "submittedAt"} dir={sortDir} /></span></TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.flatMap((a) => {
                    const isExpanded = expandedRow === a.id;
                    const rowClass = "text-sm hover:bg-muted/30 transition-colors" + (isExpanded ? " bg-muted/20" : "");
                    const rows = [
                      <TableRow key={"r" + a.id} className={rowClass} data-testid={"row-assessment-" + a.id}>
                        <TableCell className="pr-0">
                          <button
                            type="button"
                            onClick={() => setExpandedRow(isExpanded ? null : a.id)}
                            className="p-0.5 rounded hover:bg-muted transition-colors"
                            title="Show availability slots"
                            data-testid={"button-expand-" + a.id}
                          >
                            <ChevronRight className={"h-3.5 w-3.5 text-muted-foreground transition-transform" + (isExpanded ? " rotate-90" : "")} />
                          </button>
                        </TableCell>
                        <TableCell><span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{a.accessCode}</span></TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-xs leading-tight">{a.saccoName || <span className="text-muted-foreground italic">Unnamed</span>}</p>
                            {(a.county || a.saccoType) && <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1"><Building2 className="h-2.5 w-2.5" />{[a.county, a.saccoType].filter(Boolean).join(" \u00b7 ")}</p>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className={"text-[10px] font-medium px-1.5 py-0 " + statusColor(a.status)}>{a.status === "submitted" ? "Submitted" : a.status === "reviewed" ? "Reviewed" : "Draft"}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={"text-[10px] font-medium px-1.5 py-0 flex items-center gap-1 w-fit " + modelColor(a.recommendedModel)}>{modelIcon(a.recommendedModel)}{modelLabel(a.recommendedModel)}</Badge></TableCell>
                        <TableCell>{a.complexityRating ? <Badge variant="outline" className={"text-[10px] font-medium px-1.5 py-0 capitalize " + complexityColor(a.complexityRating)}>{a.complexityRating.replace("_", " ")}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                        <TableCell><ScoreBar score={a.techProficiencyScore} /></TableCell>
                        <TableCell><ScoreBar score={a.accountingProficiencyScore} /></TableCell>
                        <TableCell>{a.pwinScore != null ? <span className={"text-xs tabular-nums " + pwinColor(a.pwinScore)}>{a.pwinScore}%</span> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                        <TableCell><span className="text-xs tabular-nums">{formatKES(a.estimatedRevenue)}</span></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground flex items-center gap-1">{a.submittedAt ? <><CalendarDays className="h-3 w-3" />{formatDate(a.submittedAt)}</> : "—"}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={"/assess/" + a.accessCode}><Button variant="ghost" size="icon" className="h-7 w-7" title="Open Form"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
                            <Link href={"/report/" + a.id}><Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" title="View Report"><Eye className="h-3.5 w-3.5" /></Button></Link>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Notes" onClick={() => setEditTarget(a)}><Edit3 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" title="Delete" onClick={() => setDeleteTarget(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ];
                    if (isExpanded) {
                      rows.push(
                        <TableRow key={"slots" + a.id} className="bg-muted/10 hover:bg-muted/10">
                          <TableCell />
                          <TableCell colSpan={10} className="py-3 px-4">
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3" /> SACCO Availability Slots
                              </p>
                              <AvailabilitySlotsPanel assessment={a} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    return rows;
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between text-xs text-muted-foreground pb-4">
          <p>Safaricom MySACCO · Presales Diagnostics Platform</p>
          <p>Confidential — Internal Use Only</p>
        </div>
      </main>

      {editTarget && <EditPresalesDialog assessment={editTarget} open={!!editTarget} onClose={() => setEditTarget(null)} />}
      <DeleteConfirmDialog assessment={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <CreateAssessmentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
// build: 1776841650
