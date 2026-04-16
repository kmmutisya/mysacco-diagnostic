import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, Printer, ArrowLeft, Building2, Users, Cpu, BarChart3,
  Target, AlertTriangle, CheckCircle, TrendingUp, DollarSign, Layers,
  FileDown, Zap, Clock, Network, ShieldCheck, Settings2, Gauge,
} from "lucide-react";
import type { Assessment } from "@shared/schema";

// ─── Label maps ──────────────────────────────────────────────────────────────

const MODEL_LABELS: Record<string, string> = {
  full_stack: "Full Stack (Front-End + Back-End)",
  front_end_only: "Enhanced Front-End Channels Only",
  back_end_only: "Stronger Back-End Platform Only",
};

const MODEL_PRICING: Record<string, { monthly: number; annual: number }> = {
  full_stack: { monthly: 20000, annual: 240000 },
  front_end_only: { monthly: 10000, annual: 120000 },
  back_end_only: { monthly: 15000, annual: 180000 },
};

const COMPLEXITY_LABELS: Record<string, string> = {
  standard: "Standard",
  complex: "Complex",
  highly_complex: "Highly Complex",
};

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical — Top Strategic Priority", color: "text-red-600 dark:text-red-400" },
  high: { label: "High — Act Within 3 Months", color: "text-orange-600 dark:text-orange-400" },
  medium: { label: "Medium — Within 6 Months", color: "text-amber-600 dark:text-amber-400" },
  low: { label: "Low — Exploring Future Options", color: "text-muted-foreground" },
};

const TIMELINE_LABELS: Record<string, string> = {
  immediate: "As soon as possible",
  "1-3months": "Within 1 – 3 months",
  "3-6months": "Within 3 – 6 months",
  "6months+": "6 months or more",
};

const PAIN_LABELS: Record<string, string> = {
  manual_processes: "Manual / paper-based processes",
  data_errors: "Data errors and inconsistencies",
  poor_reporting: "Poor or slow financial reporting",
  no_digital_access: "Members lack digital access",
  loan_processing: "Slow loan processing and approval",
  compliance: "Difficulty meeting SASRA compliance",
  security: "Security and fraud concerns",
  member_growth: "Inability to scale with membership growth",
  cost: "High operational costs",
  poor_integration: "Poor / no system integration",
  vendor_dependency: "Vendor lock-in / over-dependency",
  limited_products: "Limited financial product offerings",
};

const OUTCOME_LABELS: Record<string, string> = {
  digital_channels: "Member self-service digital channels",
  core_banking: "Modern core banking system",
  loan_automation: "Automated loan processing",
  reporting: "Real-time financial reporting",
  compliance_tools: "SASRA compliance tools",
  mpesa_integration: "M-PESA integration",
  analytics: "Analytics and business intelligence",
  credit_scoring: "Digital credit scoring",
  cybersecurity: "Cybersecurity and audit trails",
  product_catalog: "Product catalog management",
  cost_reduction: "Reduced operational costs",
  member_growth_tools: "Member growth and onboarding tools",
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 7 ? "bg-green-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{score}/10</span>
      </div>
      <div className="score-bar">
        <div className={`score-fill ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function parseArr(val: string | null | undefined): string[] {
  try { return JSON.parse(val || "[]"); } catch { return []; }
}

function parseObj(val: string | null | undefined): Record<string, number> {
  try { return JSON.parse(val || "{}"); } catch { return {}; }
}

function formatKES(n: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);
}

// ─── Effort / Readiness Matrix ────────────────────────────────────────────────

function computeEffortLevel(a: Assessment): { level: "Low" | "Medium" | "High" | "Highest"; color: string; desc: string } {
  const hasCbs = a.currentCoreSystem && a.currentCoreSystem !== "none" && a.currentCoreSystem !== "spreadsheets";
  const isMsDynamics = a.currentCoreSystem === "ms_dynamics" || a.currentCoreSystem === "navision";
  const hasFosa = a.hasFosa === "yes";
  const needsMigration = a.requiresDataMigration === "yes";
  const needsCustomApi = a.requiresCustomIntegration === "yes";
  const hasVendor = a.hasVendorRelationship === "yes";
  const migrationComplex = a.dataMigrationComplexity === "complex";

  // Lowest effort: FOSA + MS Dynamics/Navision
  if (hasFosa && isMsDynamics && !needsMigration && !needsCustomApi) {
    return {
      level: "Low",
      color: "text-green-600 dark:text-green-400",
      desc: "FOSA SACCO with MS Dynamics/Navision — ideal front-end overlay scenario. Minimal integration effort; MySACCO channels connect to the existing CBS via standard API.",
    };
  }
  // Also low: has CBS, no migration, standard deployment
  if (hasCbs && !needsMigration && !needsCustomApi) {
    return {
      level: "Low",
      color: "text-green-600 dark:text-green-400",
      desc: "Existing CBS with standard deployment path. API integration is straightforward and no data migration is required.",
    };
  }
  // Highest effort: complex migration + vendor coordination + custom API
  if (needsMigration && migrationComplex && needsCustomApi && hasVendor) {
    return {
      level: "Highest",
      color: "text-red-600 dark:text-red-400",
      desc: "Complex data migration combined with custom API integration and existing vendor coordination. Professional services engagement is strongly recommended. Extended deployment timeline expected.",
    };
  }
  // High: migration or custom API required
  if (needsMigration || needsCustomApi) {
    return {
      level: "High",
      color: "text-orange-600 dark:text-orange-400",
      desc: `${needsMigration ? "Data migration required" : ""}${needsMigration && needsCustomApi ? " and " : ""}${needsCustomApi ? "custom API integration required" : ""}. Deployment team will need to engage CBS vendor. Allocate additional time for data validation and testing.`,
    };
  }
  // No CBS, no digital — greenfield full stack
  if (!hasCbs) {
    return {
      level: "Medium",
      color: "text-amber-600 dark:text-amber-400",
      desc: "Greenfield deployment — no existing CBS to integrate with. MySACCO Full Stack will be deployed from scratch. Moderate effort for Chart of Accounts setup and member data entry.",
    };
  }
  return {
    level: "Medium",
    color: "text-amber-600 dark:text-amber-400",
    desc: "Standard deployment with moderate complexity. Some configuration and staff training will be required.",
  };
}

// ─── HLD Module resolver ──────────────────────────────────────────────────────

function getHLDModules(a: Assessment, model: string) {
  const frontEnd = model === "full_stack" || model === "front_end_only";
  const backEnd = model === "full_stack" || model === "back_end_only";
  const hasFosa = a.hasFosa === "yes";
  const hasPaybill = a.existingPaybill === "yes";

  const feModules = frontEnd ? [
    { name: "Mobile App (Android & iOS)", desc: "Branded member app — account access, loans, statements, notifications" },
    { name: "USSD (*MySACCO#)", desc: "Feature-phone access for all members regardless of smartphone ownership" },
    { name: "Web Member Portal", desc: "Browser-based self-service portal for member account management" },
    { name: "M-PESA Integration", desc: hasPaybill ? `Connects to existing Paybill ${a.paybillNumber || ""}. One-Account for deposits & withdrawals` : "New M-PESA Paybill provisioning required for deposits & withdrawals" },
  ] : [];

  const beModules = backEnd ? [
    { name: "Core Banking System", desc: "Member ledgers, savings accounts, share capital management" },
    { name: "Loan Management", desc: "Full lifecycle: application → appraisal → disbursement → repayment → closure" + (parseArr(a.specialLoanProducts).length > 0 ? ". Special products: " + parseArr(a.specialLoanProducts).join(", ") : "") },
    { name: "Financial Accounting", desc: "Double-entry bookkeeping, Chart of Accounts, automated reconciliation" + (a.chartOfAccountsSetup === "no" ? ". CoA setup required from scratch" : "") },
    ...(hasFosa ? [{ name: "FOSA Module", desc: "Front-Office Savings & Loan activities: transactional banking, ATM/cheque, standing orders" }] : []),
    { name: "SASRA Compliance Reporting", desc: "Automated generation of required regulatory returns (SASRA 1–12)" },
    { name: "Audit Trail & Security", desc: "Role-based access controls, transaction audit logs, fraud detection flags" },
    { name: "Management Reports & Dashboards", desc: "Real-time operational and financial dashboards for management and board" },
  ] : [];

  const integrationPoints = [];
  if (model === "front_end_only" && (a.currentCoreSystem && a.currentCoreSystem !== "none")) {
    integrationPoints.push({ name: "CBS Integration Layer", desc: `API bridge between MySACCO Front-End and existing ${a.currentCoreSystem === "other" ? (a.currentCoreSystemOther || "CBS") : a.currentCoreSystem}. ${a.requiresCustomIntegration === "yes" ? "Custom integration required — API docs needed." : "Standard REST/SOAP API integration."}` });
  }
  if (model === "full_stack" && a.requiresDataMigration === "yes") {
    integrationPoints.push({ name: "Data Migration Service", desc: `Migration from ${a.currentCoreSystem === "other" ? (a.currentCoreSystemOther || "existing CBS") : a.currentCoreSystem || "existing system"}. Complexity: ${a.dataMigrationComplexity || "TBD"}. ETL pipeline → validation → parallel run → cutover.` });
  }

  return { feModules, beModules, integrationPoints };
}

// ─── Setup Requirements builder ───────────────────────────────────────────────

function getSetupRequirements(a: Assessment, model: string) {
  const hasCbs = a.currentCoreSystem && a.currentCoreSystem !== "none" && a.currentCoreSystem !== "spreadsheets";
  const items: { label: string; value: string; flag: "green" | "amber" | "red" | "neutral" }[] = [];

  // Deployment model
  items.push({
    label: "Deployment Type",
    value: model === "full_stack" ? "Full Stack (greenfield or migration)" : model === "front_end_only" ? "Front-End overlay on existing CBS" : "Back-End replacement / upgrade",
    flag: "neutral",
  });

  // Data migration
  if (hasCbs) {
    items.push({
      label: "Data Migration",
      value: a.requiresDataMigration === "yes"
        ? `Required — ${a.dataMigrationComplexity || "complexity TBD"}`
        : a.requiresDataMigration === "unsure"
        ? "TBD — assessment needed with CBS vendor"
        : "Not required (starting fresh)",
      flag: a.requiresDataMigration === "yes" ? (a.dataMigrationComplexity === "complex" ? "red" : "amber") : "green",
    });
  }

  // API integration
  if (hasCbs) {
    items.push({
      label: "Custom API Integration",
      value: a.requiresCustomIntegration === "yes"
        ? `Required — ${a.integrationDetails ? a.integrationDetails.slice(0, 80) + (a.integrationDetails.length > 80 ? "…" : "") : "see integration details"}`
        : a.requiresCustomIntegration === "unsure"
        ? "TBD — confirm with vendor"
        : "Not required (standard deployment)",
      flag: a.requiresCustomIntegration === "yes" ? "amber" : "green",
    });

    items.push({
      label: "API Documentation",
      value: a.hasApiDocumentation === "yes" ? "Available ✓" : a.hasApiDocumentation === "partial" ? "Partial — to be completed" : "Not available — must be obtained from vendor",
      flag: a.hasApiDocumentation === "yes" ? "green" : a.hasApiDocumentation === "partial" ? "amber" : "red",
    });
  }

  // Vendor
  items.push({
    label: "Deployment Lead",
    value: a.vendorCanAssist === "vendor"
      ? `Existing vendor (${a.vendorName || "name TBC"}) to assist`
      : a.vendorCanAssist === "sacco_self"
      ? "SACCO internal IT team"
      : a.vendorCanAssist === "safaricom"
      ? "Safaricom Professional Services (billable)"
      : "TBD",
    flag: a.vendorCanAssist === "safaricom" ? "amber" : "neutral",
  });

  // Sandbox
  items.push({
    label: "Test / Sandbox Environment",
    value: a.hasSandbox === "yes" ? "Available ✓" : a.hasSandbox === "no" ? "Not available — Safaricom to provision" : "TBD",
    flag: a.hasSandbox === "yes" ? "green" : "amber",
  });

  // Paybill
  items.push({
    label: "M-PESA Paybill",
    value: a.existingPaybill === "yes"
      ? `Existing paybill ${a.paybillNumber || ""}${a.paybillOneAccount === "yes" ? " (One-Account configured)" : " — One-Account setup required"}`
      : "New paybill provisioning required",
    flag: a.existingPaybill === "yes" && a.paybillOneAccount === "yes" ? "green" : "amber",
  });

  // Custom branding
  items.push({
    label: "Custom Branding",
    value: a.requiresCustomBranding === "yes" ? "Required — SACCO brand assets needed" : "Standard MySACCO branding",
    flag: "neutral",
  });

  // Chart of Accounts
  items.push({
    label: "Chart of Accounts",
    value: a.chartOfAccountsSetup === "yes"
      ? "Existing CoA — migration/mapping required"
      : a.chartOfAccountsSetup === "partial"
      ? "Partial CoA — completion needed"
      : "New CoA setup required from scratch",
    flag: a.chartOfAccountsSetup === "yes" ? "amber" : a.chartOfAccountsSetup === "partial" ? "amber" : "red",
  });

  return items;
}

// ─── Main Report Page ─────────────────────────────────────────────────────────

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: assessment, isLoading } = useQuery<Assessment>({
    queryKey: ["/api/assessments", id],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/assessments/${id}`);
      return r.json();
    },
    enabled: !!id,
  });

  if (isLoading || !assessment) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const model = assessment.recommendedModel || "full_stack";
  const complexity = assessment.complexityRating || "standard";
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.full_stack;
  const painPoints = parseArr(assessment.painPoints);
  const outcomes = parseArr(assessment.desiredOutcomes);
  const specialLoans = parseArr(assessment.specialLoanProducts);
  const complaints = parseArr(assessment.memberComplaintTypes);
  const techScore = assessment.techProficiencyScore || 0;
  const accScore = assessment.accountingProficiencyScore || 0;

  // Revenue breakdown from DB or fall back to subscription only
  const revBreakdown = parseObj((assessment as any).estimatedRevenueBreakdown);
  const subRevenue = revBreakdown.subscription || pricing.annual;
  const loanRevenue = revBreakdown.loans || 0;
  const withdrawalRevenue = revBreakdown.withdrawals || 0;
  const totalRevenue = assessment.estimatedRevenue || subRevenue;

  const effort = computeEffortLevel(assessment);
  const setupItems = getSetupRequirements(assessment, model);
  const urgencyInfo = URGENCY_LABELS[assessment.solutionUrgency || ""] || null;
  const { feModules, beModules, integrationPoints } = getHLDModules(assessment, model);

  const flagColor = (flag: string) => {
    if (flag === "green") return "text-green-600 dark:text-green-400";
    if (flag === "amber") return "text-amber-600 dark:text-amber-400";
    if (flag === "red") return "text-red-600 dark:text-red-400";
    return "text-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Screen header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-card border-b px-4 py-3 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-xs text-muted-foreground hidden sm:block">Pre-Sales Solution Design Brief</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { window.open(`/api/assessments/${assessment.id}/docx`, "_blank"); }}
            >
              <FileDown className="h-4 w-4 mr-2" /> DOCX
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Report header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">CONFIDENTIAL — Safaricom Presales Internal</span>
            <span>·</span>
            <code className="font-mono">{assessment.accessCode}</code>
            <span>·</span>
            <span>{assessment.submittedAt ? new Date(assessment.submittedAt).toLocaleDateString("en-KE", { dateStyle: "long" }) : "Draft"}</span>
          </div>
          <div className="saf-line w-24" />
          <h1 className="text-2xl font-bold">{assessment.saccoName || "SACCO Lead"}</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline">{assessment.saccoType || "SACCO"}</Badge>
            {assessment.county && <Badge variant="outline">{assessment.county}</Badge>}
            {assessment.industry && <Badge variant="outline">{assessment.industry}</Badge>}
            <Badge className={`badge-${complexity}`}>{COMPLEXITY_LABELS[complexity]} Requirements</Badge>
            <Badge className={`badge-${model}`}>{MODEL_LABELS[model]}</Badge>
          </div>
        </div>

        {/* Key Metrics strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Members", value: assessment.totalMembers || "—" },
            { icon: TrendingUp, label: "Growth Rate", value: assessment.memberGrowthRate || "—" },
            { icon: DollarSign, label: "Monthly Txn Vol", value: assessment.monthlyTransactionVolume || "—" },
            { icon: Building2, label: "Has FOSA", value: assessment.hasFosa === "yes" ? "Yes" : "No" },
          ].map((m) => (
            <Card key={m.label} className="border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <m.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
                <div className="font-semibold text-sm">{m.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {/* ── Left: main analysis ── */}
          <div className="sm:col-span-2 space-y-5">

            {/* 1. Recommended Model */}
            <Card className="border-primary/30 bg-green-50/50 dark:bg-green-900/10">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Recommended MySACCO Model</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`badge-${model} text-sm px-3 py-1`}>{MODEL_LABELS[model]}</Badge>
                  <Badge className={`badge-${complexity}`}>{COMPLEXITY_LABELS[complexity]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{assessment.presalesNotes || "See detailed assessment below."}</p>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 text-xs font-medium bg-muted p-2 text-center">
                    <div>Front-End Only</div>
                    <div>Back-End Only</div>
                    <div>Full Stack</div>
                  </div>
                  <div className="grid grid-cols-3 text-xs p-2 text-center border-t">
                    <div className={`py-1 rounded ${model === "front_end_only" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}>KES 10,000/mo</div>
                    <div className={`py-1 rounded ${model === "back_end_only" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}>KES 15,000/mo</div>
                    <div className={`py-1 rounded ${model === "full_stack" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}>KES 20,000/mo</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Urgency & Appetite */}
            {(assessment.solutionUrgency || assessment.preferredRolloutTimeline) && (
              <Card className={`border-l-4 ${urgencyInfo ? "border-l-orange-400" : "border-l-border"}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-base">Urgency & Appetite</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {assessment.solutionUrgency && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground font-medium">Solution Urgency</div>
                        <div className={`text-sm font-semibold ${urgencyInfo?.color || ""}`}>
                          {urgencyInfo?.label || assessment.solutionUrgency}
                        </div>
                      </div>
                    )}
                    {assessment.preferredRolloutTimeline && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground font-medium">Preferred Go-Live</div>
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {TIMELINE_LABELS[assessment.preferredRolloutTimeline] || assessment.preferredRolloutTimeline}
                        </div>
                      </div>
                    )}
                  </div>
                  {assessment.solutionUrgency && (
                    <div className="text-xs bg-muted/50 rounded-lg p-2.5 text-muted-foreground">
                      {assessment.solutionUrgency === "critical" && "Flag as hot lead. Schedule pre-sales call within 48 hours. Prioritise demo and proposal."}
                      {assessment.solutionUrgency === "high" && "High priority lead. Follow up within the week. Demo within 2 weeks."}
                      {assessment.solutionUrgency === "medium" && "Nurture track. Schedule follow-up in 2–3 weeks with proposal."}
                      {assessment.solutionUrgency === "low" && "Long-term pipeline. Add to nurture sequence and follow up quarterly."}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 3. Readiness / Effort */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Deployment Readiness & Effort</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${effort.color}`}>{effort.level} Effort</div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${effort.level === "Low" ? "bg-green-500 w-1/4" : effort.level === "Medium" ? "bg-amber-500 w-2/4" : effort.level === "High" ? "bg-orange-500 w-3/4" : "bg-red-500 w-full"}`}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{effort.desc}</p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="font-medium mb-1">Tech Proficiency</div>
                    <ScoreBar score={techScore} label="" />
                    <div className="text-muted-foreground mt-1">
                      {techScore >= 7 ? "High digital maturity — minimal IT training." : techScore >= 4 ? "Moderate — training and change management needed." : "Low maturity — extended onboarding support required."}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="font-medium mb-1">Accounting Proficiency</div>
                    <ScoreBar score={accScore} label="" />
                    <div className="text-muted-foreground mt-1">
                      {accScore >= 7 ? "Strong accounting structure. CoA migration straightforward." : accScore >= 4 ? "Moderate — some CoA work and reconciliation training." : "Low — full accounting setup from scratch required."}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Setup Requirements */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Setup Requirements</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {setupItems.map((item) => (
                    <div key={item.label} className="flex items-start justify-between text-sm border-b border-dashed border-border pb-2 gap-3">
                      <span className="text-muted-foreground shrink-0">{item.label}</span>
                      <span className={`font-medium text-right text-xs leading-snug ${flagColor(item.flag)}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                {assessment.integrationDetails && (
                  <div className="bg-muted/40 rounded-lg p-3 text-sm mt-3">
                    <div className="font-medium mb-1 text-xs text-muted-foreground">Integration Details</div>
                    {assessment.integrationDetails}
                  </div>
                )}
                {specialLoans.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Special Loan Products</div>
                    <div className="flex flex-wrap gap-1.5">
                      {specialLoans.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">{p.replace(/_/g, " ")}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5. Pain Points & Goals */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">Pain Points & Goals</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessment.topPriority && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                    <span className="font-semibold text-primary">Top Priority: </span>
                    {assessment.topPriority}
                  </div>
                )}
                {painPoints.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Identified Pain Points</div>
                    <div className="flex flex-wrap gap-1.5">
                      {painPoints.map((p) => (
                        <span key={p} className="text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded px-2 py-0.5">
                          {PAIN_LABELS[p] || p.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    {assessment.painPointsOther && <p className="text-xs text-muted-foreground mt-2">Other: {assessment.painPointsOther}</p>}
                  </div>
                )}
                {complaints.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Member Complaint Types</div>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {complaints.map((c) => <li key={c} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />{c.replace(/_/g, " ")}</li>)}
                    </ul>
                    {assessment.memberComplaintsOther && <p className="text-xs text-muted-foreground mt-1">Other: {assessment.memberComplaintsOther}</p>}
                  </div>
                )}
                {outcomes.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Desired Outcomes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {outcomes.map((o) => (
                        <span key={o} className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded px-2 py-0.5">
                          {OUTCOME_LABELS[o] || o.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    {assessment.desiredOutcomesOther && <p className="text-xs text-muted-foreground mt-1">Other: {assessment.desiredOutcomesOther}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 6. High-Level Design */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">High-Level Design</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Architecture text diagram */}
                <div className="bg-muted/30 rounded-lg border p-4 font-mono text-xs leading-relaxed overflow-x-auto">
                  <pre className="whitespace-pre text-muted-foreground">{[
                    "┌─────────────────── MEMBER / STAFF ───────────────────┐",
                    `│  ${feModules.length > 0 ? "Mobile App   USSD       Web Portal  " : "                                    "}       │`,
                    `│  ${feModules.length > 0 ? "[Android/iOS] [*MySACCO#] [browser] " : "(Front-End not in scope)             "}       │`,
                    "└──────────────┬────────────┬─────────────┬────────────┘",
                    "               │            │             │",
                    "       ┌───────▼────────────▼─────────────▼──────┐",
                    "       │       MySACCO API Gateway / M-PESA       │",
                    "       │         (Daraja API Integration)         │",
                    "       └─────────────────┬────────────────────────┘",
                    "                         │",
                    "       ┌─────────────────▼────────────────────────┐",
                    `       │  ${beModules.length > 0 ? "MySACCO Back-End Platform             " : "Existing CBS (API Integration Layer)  "}│`,
                    `       │  ${beModules.length > 0 ? "Core Banking | Loans | Accounting      " : "                                      "}│`,
                    `       │  ${beModules.length > 0 ? "SASRA Reports | Audit | Management     " : "                                      "}│`,
                    "       └──────────────────────────────────────────┘",
                    ...(integrationPoints.length > 0 ? [
                      "                         │",
                      "       ┌─────────────────▼────────────────────────┐",
                      "       │       External / Legacy CBS               │",
                      `       │       ${assessment.currentCoreSystem === "other" ? (assessment.currentCoreSystemOther || "Custom CBS") : assessment.currentCoreSystem || "Existing System"}${" ".repeat(Math.max(0, 33 - ((assessment.currentCoreSystem || "").length)))}│`,
                      "       └──────────────────────────────────────────┘",
                    ] : []),
                  ].join("\n")}</pre>
                </div>

                {feModules.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-semibold">Front-End Channels</span>
                    </div>
                    <div className="space-y-2">
                      {feModules.map((m) => (
                        <div key={m.name} className="flex items-start gap-3 text-sm bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-2.5 border border-blue-100 dark:border-blue-900/30">
                          <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground"> — {m.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {beModules.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Back-End Platform</span>
                    </div>
                    <div className="space-y-2">
                      {beModules.map((m) => (
                        <div key={m.name} className="flex items-start gap-3 text-sm bg-green-50/50 dark:bg-green-900/10 rounded-lg p-2.5 border border-green-100 dark:border-green-900/30">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground"> — {m.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {integrationPoints.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold">Integration Points</span>
                    </div>
                    <div className="space-y-2">
                      {integrationPoints.map((m) => (
                        <div key={m.name} className="flex items-start gap-3 text-sm bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-2.5 border border-amber-100 dark:border-amber-900/30">
                          <CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground"> — {m.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 7. SACCO Structure */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">SACCO Structure</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ["SACCO Type", assessment.saccoType],
                    ["SASRA Licensed", assessment.sasraLicensed === "yes" ? "Yes ✓" : assessment.sasraLicensed === "pending" ? "Pending" : "No"],
                    ["Has FOSA", assessment.hasFosa === "yes" ? "Yes" : "No"],
                    ["Has BOSA", assessment.hasBosa === "yes" ? "Yes" : "No"],
                    ["Core System", assessment.currentCoreSystem === "other" ? (assessment.currentCoreSystemOther || "Other") : assessment.currentCoreSystem || "—"],
                    ["CBS Age", assessment.coreSystemAge || "—"],
                    ["Vendor Relationship", assessment.hasVendorRelationship === "yes" ? (assessment.vendorName || "Yes") : "No"],
                    ["IT Staff", assessment.itStaffCount || "—"],
                    ["Finance Staff", assessment.financialStaffCount || "—"],
                    ["Reconciliation", assessment.reconciliationFrequency || "—"],
                    ["SASRA Reporting", assessment.sasraReportingCapability || "—"],
                    ["Has Paybill", assessment.existingPaybill === "yes" ? `Yes (${assessment.paybillNumber || "—"})` : "No"],
                    ["Digital Adoption", assessment.memberDigitalAdoptionRate || "—"],
                    ["Avg Monthly Loans", assessment.avgMonthlyLoans || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-dashed border-border pb-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-right">{v || "—"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Presales notes */}
            {(assessment.presalesNotes || assessment.nextSteps) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pre-Sales Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessment.presalesNotes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assessment.presalesNotes}</p>}
                  {assessment.nextSteps && (
                    <>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Steps</div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assessment.nextSteps}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-5">

            {/* Revenue Potential (enhanced) */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Revenue Potential</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-primary">{formatKES(totalRevenue)}</div>
                  <div className="text-xs text-muted-foreground">Estimated annual revenue</div>
                </div>
                <div className="space-y-2 text-xs border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subscription ({formatKES(MODEL_PRICING[model]?.monthly || 20000)}/mo)</span>
                    <span className="font-medium">{formatKES(subRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loan commissions (est. 1% capped KES 3k)</span>
                    <span className="font-medium">{formatKES(loanRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Withdrawal fees (KES 15/txn est.)</span>
                    <span className="font-medium">{formatKES(withdrawalRevenue)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatKES(totalRevenue)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">Estimates based on declared member count, loan volume, and digital adoption rate. Actuals will vary.</p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="font-medium">{assessment.contactPersonName || "—"}</div>
                <div className="text-muted-foreground">{assessment.contactPersonTitle || ""}</div>
                {assessment.contactEmail && <div className="text-xs">{assessment.contactEmail}</div>}
                {assessment.contactPhone && <div className="text-xs">{assessment.contactPhone}</div>}
              </CardContent>
            </Card>

            {/* Onboarding Checklist */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Onboarding Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  {[
                    "SACCO registration certificate",
                    "SASRA license",
                    "AML/CFT policies document",
                    "Data protection policy",
                    "Terms & Conditions document",
                    "Current Solution Design Document",
                    "Paybill number",
                    ...(model !== "back_end_only" ? ["Member Consent Form", "API Documentation"] : []),
                    ...(assessment.requiresDataMigration === "yes" ? ["Data export from existing CBS", "Data mapping template"] : []),
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* PWIN */}
            {assessment.pwinScore != null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">PWIN Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{assessment.pwinScore}%</div>
                  <div className="text-xs text-muted-foreground">Probability of win</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          <div>MySACCO Lead Diagnostic — Safaricom Business | C2 - Safaricom Internal</div>
          <div className="mt-1">Generated: {new Date().toLocaleDateString("en-KE", { dateStyle: "full" })}</div>
        </div>
      </div>
    </div>
  );
}
