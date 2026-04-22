import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Printer, ArrowLeft, Building2, Users, Cpu, BarChart3,
  Target, AlertTriangle, CheckCircle, TrendingUp, DollarSign, Layers,
  FileDown, Zap, Clock, Network, ShieldCheck, Settings2, Gauge,
  Mail, Phone, MapPin, Briefcase, Shield, Globe, Star, Award,
  BookOpen, AlertCircle, Save, CalendarDays, Activity,
} from "lucide-react";
import type { Assessment } from "@shared/schema";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─── Label maps ──────────────────────────────────────────────────────────────

const MODEL_LABELS: Record<string, string> = {
  full_stack: "Full Stack (Front-End + Back-End)",
  front_end_only: "Enhanced Front-End Channels Only",
  back_end_only: "Stronger Back-End Platform Only",
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  full_stack:
    "A complete digital transformation — member-facing channels (mobile app, USSD, web portal) plus a modern core banking system. Best suited for SACCOs starting from scratch or replacing an outdated CBS.",
  front_end_only:
    "Powerful digital channels that connect to your existing core banking system via API. Ideal for SACCOs with a working CBS that need to give members digital self-service access.",
  back_end_only:
    "A robust core banking platform that handles all back-office operations, SASRA reporting, and loan lifecycle management — with API-ready integration for any digital channels already in place.",
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

const URGENCY_LABELS: Record<string, { label: string; color: string; advice: string }> = {
  critical: {
    label: "Critical — Top Strategic Priority",
    color: "text-red-600 dark:text-red-400",
    advice: "Flag as hot lead. Schedule pre-sales call within 48 hours. Prioritise demo and proposal.",
  },
  high: {
    label: "High — Act Within 3 Months",
    color: "text-orange-600 dark:text-orange-400",
    advice: "High priority lead. Follow up within the week. Demo within 2 weeks.",
  },
  medium: {
    label: "Medium — Within 6 Months",
    color: "text-amber-600 dark:text-amber-400",
    advice: "Nurture track. Schedule follow-up in 2–3 weeks with proposal.",
  },
  low: {
    label: "Low — Exploring Future Options",
    color: "text-muted-foreground",
    advice: "Long-term pipeline. Add to nurture sequence and follow up quarterly.",
  },
};

const TIMELINE_LABELS: Record<string, string> = {
  immediate: "As soon as possible",
  "1-3months": "Within 1 – 3 months",
  "3-6months": "Within 3 – 6 months",
  "6months+": "6 months or more",
};

const PAIN_LABELS: Record<string, string> = {
  manual_processes: "Manual / Paper-Based Processes",
  data_errors: "Data Errors & Inaccuracies",
  no_mobile: "No Mobile / Digital Access for Members",
  slow_loans: "Slow Loan Processing",
  poor_reporting: "Poor Financial Reporting",
  compliance_risk: "Regulatory / Compliance Risk",
  vendor_dependency: "Vendor Lock-in / Dependency",
  member_attrition: "Member Attrition",
  limited_products: "Limited Product Offering",
  high_op_cost: "High Operational Costs",
  // legacy keys kept for backwards compatibility
  manual_proc: "Manual / Paper-Based Processes",
  data_errors_legacy: "Data Errors & Inaccuracies",
  poor_reporting_legacy: "Poor Financial Reporting",
  no_digital_access: "No Mobile / Digital Access for Members",
  loan_processing: "Slow Loan Processing",
  compliance: "Regulatory / Compliance Risk",
  security: "Security & Fraud Concerns",
  member_growth: "Inability to Scale with Growth",
  cost: "High Operational Costs",
  poor_integration: "Disconnected / Poor System Integration",
  vendor_dependency_legacy: "Vendor Lock-in / Dependency",
  limited_products_legacy: "Limited Product Offering",
};

const TOP_PRIORITY_LABELS: Record<string, string> = {
  digital_member_access: "Launch Digital Member Access (Mobile/USSD)",
  replace_cbs: "Replace / Upgrade Core Banking System",
  automate_loans: "Automate Loan Processing",
  mpesa_integration: "M-PESA / Paybill Integration",
  sasra_compliance: "SASRA Regulatory Compliance",
  eliminate_manual: "Eliminate Manual / Paper Processes",
  financial_reporting: "Real-Time Financial Reporting",
  member_growth: "Drive Member Growth",
  reduce_costs: "Reduce Operational Costs",
  data_integrity: "Improve Data Integrity & Accuracy",
  cybersecurity: "Strengthen Cybersecurity",
  new_products: "Launch New Loan / Savings Products",
  vendor_exit: "Exit Current Vendor / System",
  staff_efficiency: "Improve Staff Efficiency",
};

const DESIRED_OUTCOME_LABELS: Record<string, string> = {
  digital_channels: "Launch / Improve Digital Channels",
  loan_automation: "Automate Loan Processing",
  real_time_reporting: "Real-Time Financial Reporting",
  member_experience: "Improve Member Experience",
  compliance: "Achieve Regulatory Compliance",
  cost_reduction: "Reduce Operational Costs",
  data_accuracy: "Improve Data Accuracy",
  mpesa: "M-PESA Integration",
  migration: "Smooth Data Migration",
  custom_products: "Custom Loan / Savings Products",
  // legacy keys
  core_banking: "Modern Core Banking System",
  reporting: "Real-Time Financial Reporting",
  compliance_tools: "SASRA Compliance Tools",
  mpesa_integration: "M-PESA Integration",
  analytics: "Analytics & Business Intelligence",
  credit_scoring: "Digital Credit Scoring",
  cybersecurity: "Cybersecurity & Audit Trails",
  product_catalog: "Product Catalog Management",
  member_growth_tools: "Member Growth & Onboarding Tools",
};

const MEMBER_COMPLAINT_LABELS: Record<string, string> = {
  slow_loans: "Slow Loan Approvals",
  no_mobile_access: "No Mobile App / USSD Access",
  poor_communication: "Poor Communication / Updates",
  long_queues: "Long Queues at Branch",
  system_downtime: "System Downtime",
  statement_errors: "Statement / Balance Errors",
  limited_products: "Limited Products Offered",
};

const DIGITAL_FEATURE_LABELS: Record<string, string> = {
  account_balance: "Account Balance Views",
  downloadable_statements: "Downloadable Statements",
  loan_calculator: "Loan Calculator",
  fund_transfers: "Fund Transfers",
  bank_withdrawal: "Bank Withdrawals",
  support_channels: "Support Channels (Chat/Tickets)",
  member_registration: "Member Registration",
  loan_applications: "Loan Applications",
  ussd: "USSD Access",
};

const CBS_LABELS: Record<string, string> = {
  manual: "Manual / Excel",
  tally: "Tally",
  navision: "Microsoft Navision",
  sacco_plus: "SACCO Plus",
  "co-optics": "Co-optics",
  bankers_realm: "Bankers Realm",
  mambu: "Mambu",
  ms_dynamics: "Microsoft Dynamics",
  spreadsheets: "Spreadsheets / Excel",
  none: "None",
};

const MEMBER_RANGES: Record<string, string> = {
  under_500: "Under 500",
  "500-1000": "500 – 1,000",
  "1001-5000": "1,001 – 5,000",
  "5001-10000": "5,001 – 10,000",
  "10000+": "10,000+",
};

const LOAN_LABELS: Record<string, string> = {
  emergency: "Emergency Loans",
  school_fees: "School Fees / Education Loans",
  asset_financing: "Asset Financing / Car Loans",
  group_loans: "Group / Chama Loans",
  salary_advance: "Salary Advance Loans",
  development: "Development Loans",
  insurance_backed: "Insurance-backed Loans",
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

function parseArr(val: string | null | undefined): string[] {
  try { return JSON.parse(val || "[]"); } catch { return []; }
}

function parseObj(val: string | null | undefined): Record<string, number> {
  try { return JSON.parse(val || "{}"); } catch { return {}; }
}

function formatKES(n: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);
}

function parseTopPriority(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "string");
    if (typeof parsed === "string") return [parsed];
  } catch {
    // free-text string
    if (typeof val === "string" && val.trim()) return [val.trim()];
  }
  return [];
}

function cbsLabel(a: Assessment): string {
  if (!a.currentCoreSystem) return "None / Unknown";
  if (a.currentCoreSystem === "other") return a.currentCoreSystemOther || "Other CBS";
  return CBS_LABELS[a.currentCoreSystem] || a.currentCoreSystem.replace(/_/g, " ");
}

// ─── Digital Readiness Score computation (mirrors Scorecard logic) ───────────

function computeReadinessScore(a: Assessment): number {
  const tech = a.techProficiencyScore || 0;
  const acc = a.accountingProficiencyScore || 0;
  return Math.round((tech + acc) / 2);
}

// ─── Readiness Gauge (SVG arc) ────────────────────────────────────────────────

function ReadinessGauge({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  const isHigh = score >= 7;
  const isMed = score >= 4;
  const color = isHigh ? "#16a34a" : isMed ? "#d97706" : "#dc2626";
  const label = isHigh ? "High" : isMed ? "Moderate" : "Developing";
  const labelColor = isHigh
    ? "text-green-700 dark:text-green-400"
    : isMed
    ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";
  const bgColor = isHigh
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : isMed
    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  const r = 52;
  const cx = 70;
  const cy = 70;
  const startAngle = -210;
  const sweepMax = 240;
  const sweep = (pct / 100) * sweepMax;

  function polar(angle: number, radius: number): [number, number] {
    const rad = (angle * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  function arc(start: number, end: number, radius: number, strokeWidth: number, stroke: string) {
    const [x1, y1] = polar(start, radius);
    const [x2, y2] = polar(end, radius);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return (
      <path
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-center gap-5">
        <div className="flex-shrink-0">
          <svg width="140" height="100" viewBox="0 0 140 100">
            {arc(startAngle, startAngle + sweepMax, r, 10, "currentColor")}
            {sweep > 0 && arc(startAngle, startAngle + sweep, r, 10, color)}
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>{score}</text>
            <text x={cx} y={cy + 20} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6">out of {max}</text>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Digital Readiness</p>
          <p className={`text-xl font-bold mb-1 ${labelColor}`}>{label}</p>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{pct}% readiness</p>
        </div>
      </div>
    </div>
  );
}

// ─── Readiness Narrative (mirrors Scorecard's ReadinessExplanation) ───────────

function ReadinessNarrative({ assessment }: { assessment: Assessment }) {
  const tech = assessment.techProficiencyScore || 0;
  const acc = assessment.accountingProficiencyScore || 0;
  const combined = Math.round((tech + acc) / 2);

  const hasCbs = !!(assessment.currentCoreSystem && assessment.currentCoreSystem !== "none" && assessment.currentCoreSystem !== "spreadsheets");
  const hasMobileApp = assessment.hasMobileApp === "yes";
  const hasUssd = assessment.hasUssd === "yes";
  const hasItStaff = !!(assessment.itStaffCount && assessment.itStaffCount !== "0" && assessment.itStaffCount !== "none");
  const recFreq = assessment.reconciliationFrequency;
  const coa = assessment.chartOfAccountsSetup;
  const sasra = assessment.sasraLicensed;
  const hasSandbox = assessment.hasSandbox === "yes";
  const hasFosa = assessment.hasFosa === "yes";
  const adoption = assessment.memberDigitalAdoptionRate;
  const cbsName = hasCbs ? cbsLabel(assessment) : null;
  const cbsAge = assessment.coreSystemAge;
  const itCount = assessment.itStaffCount;

  const bullets: string[] = [];

  if (hasCbs && cbsName) {
    bullets.push(
      `Running ${cbsName}${cbsAge ? `, in place for ${cbsAge.replace(/_/g, " ")}` : ""} — this provides a known integration starting point for MySACCO.`
    );
  } else {
    bullets.push("No dedicated core banking system currently in use — MySACCO will build a clean, modern foundation from day one.");
  }

  if (hasMobileApp && hasUssd) {
    bullets.push(`Both a mobile app and USSD are already active${adoption ? ` with ${adoption.replace(/_/g, " ").replace("percent", "%")} member adoption` : ""} — MySACCO will enhance and unify these channels.`);
  } else if (hasMobileApp || hasUssd) {
    const ch = hasMobileApp ? "a mobile app" : "USSD access";
    bullets.push(`${ch.charAt(0).toUpperCase() + ch.slice(1)} is already running — MySACCO will complement and strengthen this existing digital touchpoint.`);
  } else {
    bullets.push("Members currently have no digital self-service access. MySACCO will introduce a mobile app and USSD, enabling 24/7 account access from anywhere.");
  }

  if (hasItStaff) {
    bullets.push(`With ${itCount === "1" ? "1 IT person" : itCount === "2-5" ? "2–5 IT staff" : "an IT team"} on board, the SACCO is positioned to support the MySACCO rollout and ongoing maintenance.`);
  } else {
    bullets.push("Limited in-house IT capacity — Safaricom's deployment and support teams will fully manage the technical rollout and provide ongoing support.");
  }

  if (hasFosa) {
    bullets.push("FOSA-enabled SACCO handling real-time member transactions — MySACCO's M-PESA integration and digital channels are directly designed for this.");
  }

  if (recFreq === "daily" || recFreq === "weekly") {
    bullets.push(`${recFreq === "daily" ? "Daily" : "Weekly"} reconciliation shows strong financial discipline — MySACCO will automate this process and reduce manual effort significantly.`);
  } else if (recFreq === "monthly") {
    bullets.push("Monthly reconciliation leaves gaps between books and the bank. MySACCO's automated reconciliation engine will close this to real-time.");
  } else if (recFreq === "ad_hoc" || recFreq === "rarely") {
    bullets.push("Irregular reconciliation is a significant risk area. MySACCO automates this, keeping the books always accurate and audit-ready.");
  }

  if (coa === "fully_setup") {
    bullets.push("Chart of accounts is fully configured — MySACCO can import and map this directly, minimising setup time.");
  } else if (coa === "partial") {
    bullets.push("Chart of accounts is partially set up. MySACCO's implementation team will complete and standardise this during onboarding.");
  } else if (coa === "none") {
    bullets.push("No chart of accounts yet. MySACCO includes a SACCO-standard chart of accounts out of the box, aligned with SASRA requirements.");
  }

  if (sasra === "yes") {
    bullets.push("SASRA-licensed with active regulatory reporting obligations. MySACCO's built-in compliance module generates all required returns automatically.");
  } else if (sasra === "pending") {
    bullets.push("Pursuing SASRA licensing — MySACCO is built to be fully SASRA-compliant from day one, smoothing the licensing journey.");
  }

  if (hasSandbox) {
    bullets.push("Vendor supports sandbox testing, accelerating integration timelines and reducing go-live risk.");
  }

  let opening = "";
  if (combined >= 7) {
    opening = `${assessment.saccoName || "This SACCO"} has a strong digital foundation. The systems and processes already in place significantly reduce the complexity and cost of deploying MySACCO.`;
  } else if (combined >= 4) {
    opening = `${assessment.saccoName || "This SACCO"} has a solid base to build on. MySACCO will fill the key gaps in the current setup, supported by Safaricom's full onboarding team.`;
  } else {
    opening = `${assessment.saccoName || "This SACCO"} is at the start of its digital journey — the right time to act. MySACCO is designed to modernise SACCOs from the ground up, with Safaricom's full deployment and training support every step of the way.`;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground leading-relaxed">{opening}</p>
      <ul className="space-y-2">
        {bullets.slice(0, 5).map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── SWOT Analysis (mirrors Scorecard's SWOTAnalysis) ─────────────────────────

function SWOTAnalysis({ assessment }: { assessment: Assessment }) {
  const hasCbs = !!(assessment.currentCoreSystem && assessment.currentCoreSystem !== "none" && assessment.currentCoreSystem !== "spreadsheets");
  const hasMobileApp = assessment.hasMobileApp === "yes";
  const hasUssd = assessment.hasUssd === "yes";
  const hasItStaff = !!(assessment.itStaffCount && assessment.itStaffCount !== "0" && assessment.itStaffCount !== "none");
  const hasFosa = assessment.hasFosa === "yes";
  const hasBosa = assessment.hasBosa === "yes";
  const sasra = assessment.sasraLicensed;
  const recFreq = assessment.reconciliationFrequency;
  const coa = assessment.chartOfAccountsSetup;
  const cbsAge = assessment.coreSystemAge;
  const hasSandbox = assessment.hasSandbox === "yes";
  const painPoints = parseArr(assessment.painPoints);
  const hasPaybill = assessment.existingPaybill === "yes";
  const memberCount = assessment.totalMembers;
  const growthRate = assessment.memberGrowthRate;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // Strengths
  if (hasCbs) strengths.push("Existing core banking system in place");
  if (hasMobileApp || hasUssd) strengths.push("Active digital channels with existing member adoption");
  if (hasItStaff) strengths.push("In-house IT capacity to support deployment");
  if (hasFosa && hasBosa) strengths.push("Full-service SACCO (FOSA + BOSA) offering");
  else if (hasFosa) strengths.push("FOSA capability — real-time member transactions");
  if (sasra === "yes") strengths.push("SASRA-licensed with established compliance processes");
  if (hasPaybill) strengths.push("Existing M-PESA Paybill for member transactions");
  if (hasSandbox) strengths.push("Vendor sandbox available — lower integration risk");
  if (coa === "fully_setup") strengths.push("Well-configured chart of accounts");
  if (recFreq === "daily" || recFreq === "weekly") strengths.push("Regular reconciliation discipline");
  if (memberCount === "5001-10000" || memberCount === "10000+") strengths.push("Large, established membership base");
  if (strengths.length === 0) strengths.push("Committed leadership pursuing digital transformation");

  // Weaknesses
  if (!hasCbs) weaknesses.push("No dedicated core banking system — manual or spreadsheet-driven operations");
  if (!hasMobileApp && !hasUssd) weaknesses.push("No digital member self-service channels");
  if (!hasItStaff) weaknesses.push("Limited in-house IT expertise for system management");
  if (recFreq === "monthly" || recFreq === "ad_hoc" || recFreq === "rarely") weaknesses.push("Infrequent reconciliation — elevated risk of financial discrepancies");
  if (coa === "none") weaknesses.push("No chart of accounts — accounting foundation needs building");
  else if (coa === "partial") weaknesses.push("Incomplete chart of accounts — may cause reporting gaps");
  if (painPoints.includes("manual_processes") || painPoints.includes("manual_proc")) weaknesses.push("Heavy reliance on manual, paper-based processes");
  if (painPoints.includes("data_errors")) weaknesses.push("Data quality and record accuracy issues");
  if (painPoints.includes("vendor_dependency")) weaknesses.push("High dependency on existing technology vendor");
  if (cbsAge === "over_5_years" || cbsAge === "3_5_years") weaknesses.push("Ageing core banking system — technical debt accumulating");
  if (weaknesses.length === 0) weaknesses.push("Some operational processes still to be fully digitised");

  // Opportunities
  if (!hasMobileApp || !hasUssd) opportunities.push("Launch mobile and USSD channels to unlock member self-service");
  if (!hasPaybill || hasFosa) opportunities.push("M-PESA One-Account integration to eliminate manual withdrawal queues");
  if (growthRate === "fast" || growthRate === "moderate") opportunities.push("Leverage growing membership with scalable digital infrastructure");
  if (sasra === "pending") opportunities.push("SASRA licensing journey — MySACCO automates all required regulatory returns");
  if (painPoints.includes("loan_processing") || painPoints.includes("slow_loans")) opportunities.push("Automate loan processing to dramatically reduce turnaround times");
  if (painPoints.includes("limited_products")) opportunities.push("Introduce new loan and savings products enabled by a modern platform");
  if (hasBosa) opportunities.push("Digitise BOSA savings products for member self-service contributions");
  if (painPoints.includes("poor_reporting")) opportunities.push("Real-time dashboards to give management instant financial visibility");
  opportunities.push("Safaricom ecosystem access — M-PESA, Lipa Na M-PESA, and future innovations");
  if (opportunities.length > 5) opportunities.splice(5);

  // Threats
  if (painPoints.includes("security")) threats.push("Rising cyber threats and fraud risk in financial services");
  if (painPoints.includes("compliance") || painPoints.includes("compliance_risk")) threats.push("Increasing SASRA regulatory scrutiny and reporting requirements");
  threats.push("Growing member expectations for digital-first services from competitors");
  if (!hasCbs) threats.push("Manual operations expose the SACCO to errors, fraud, and audit risk");
  if (painPoints.includes("vendor_dependency")) threats.push("Single-vendor lock-in limits flexibility and negotiation power");
  if (memberCount === "under_500" || memberCount === "500-1000") threats.push("Risk of member attrition to digitally-enabled competitors");
  threats.push("Rapid change in the fintech landscape — early movers capture market share");
  if (threats.length > 4) threats.splice(4);

  const quadrants = [
    {
      title: "Strengths",
      icon: <Star className="h-4 w-4" />,
      items: strengths.slice(0, 4),
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      titleColor: "text-green-800 dark:text-green-300",
      dotColor: "bg-green-500",
      iconBg: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    },
    {
      title: "Weaknesses",
      icon: <AlertCircle className="h-4 w-4" />,
      items: weaknesses.slice(0, 4),
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      titleColor: "text-red-800 dark:text-red-300",
      dotColor: "bg-red-400",
      iconBg: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    },
    {
      title: "Opportunities",
      icon: <TrendingUp className="h-4 w-4" />,
      items: opportunities.slice(0, 4),
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      titleColor: "text-blue-800 dark:text-blue-300",
      dotColor: "bg-blue-500",
      iconBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    },
    {
      title: "Threats",
      icon: <Zap className="h-4 w-4" />,
      items: threats.slice(0, 4),
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      titleColor: "text-amber-800 dark:text-amber-300",
      dotColor: "bg-amber-500",
      iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {quadrants.map((q) => (
        <div key={q.title} className={`rounded-xl border p-4 ${q.bg} ${q.border}`}>
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold mb-3 ${q.iconBg}`}>
            {q.icon}
            {q.title}
          </div>
          <ul className="space-y-1.5">
            {q.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-snug text-foreground/80">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${q.dotColor}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Why Safaricom + Why MySACCO (mirrors Scorecard's WhySafaricomMySACCO) ───

function WhySafaricomMySACCO({ assessment }: { assessment: Assessment }) {
  const painPoints = parseArr(assessment.painPoints);
  const hasFosa = assessment.hasFosa === "yes";

  const safaricomReasons = [
    {
      icon: <Globe className="h-4 w-4" />,
      title: "Kenya's most trusted brand",
      body: "Safaricom is the most trusted technology company in Kenya, with over 20 years of serving Kenyans across every county. SACCO members already trust Safaricom.",
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: "Unmatched network & infrastructure",
      body: "Safaricom's network reaches over 97% of Kenya's population, with enterprise-grade uptime and infrastructure backing every solution it delivers.",
    },
    {
      icon: <Zap className="h-4 w-4" />,
      title: "M-PESA ecosystem advantage",
      body: "No other provider gives native, real-time M-PESA integration. With MySACCO, deposits, withdrawals, and loan disbursements move instantly through M-PESA — the platform members already use every day.",
    },
    {
      icon: <Users className="h-4 w-4" />,
      title: "Dedicated SACCO expertise",
      body: "Safaricom's MySACCO team combines deep SACCO domain knowledge with enterprise technology delivery — from presales diagnosis through deployment and long-term support.",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: "Regulatory alignment",
      body: "Safaricom works within Kenya's regulatory environment. MySACCO is built to meet SASRA requirements out of the box — compliance is never an afterthought.",
    },
  ];

  const mySACCOReasons = [
    {
      icon: <Award className="h-4 w-4" />,
      title: "Built for Kenyan SACCOs",
      body: "MySACCO is not a generic banking platform adapted for SACCOs — it was designed specifically for the Kenyan cooperative financial sector, with SACCO-native workflows, product structures, and reporting.",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      title: "End-to-end digital transformation",
      body: "From the member's mobile app to the core banking back-end to SASRA regulatory reports — MySACCO covers the full stack. One vendor, one integration, one support team.",
    },
    {
      icon: <Zap className="h-4 w-4" />,
      title: "Rapid deployment",
      body: "MySACCO is designed for fast, low-disruption deployment. Most SACCOs go live within weeks, not months — with data migration, staff training, and member onboarding supported end to end.",
    },
    {
      icon: <Star className="h-4 w-4" />,
      title: "Affordable, scalable pricing",
      body: "MySACCO is priced for Kenyan SACCOs — not for multinational banks. Flexible subscription tiers grow with membership, so the SACCO only pays for what it needs.",
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: "Enterprise security at SACCO scale",
      body: "Full audit trails, role-based access controls, encrypted data, and fraud detection — the same security standards that protect Safaricom's enterprise customers, applied at SACCO scale.",
    },
  ];

  // Personalise based on flags
  if (hasFosa) {
    mySACCOReasons[1] = {
      ...mySACCOReasons[1],
      body: mySACCOReasons[1].body + " For FOSA operations specifically, MySACCO handles real-time M-PESA withdrawals, deposits, and instant teller transactions.",
    };
  }
  if (painPoints.includes("compliance") || painPoints.includes("compliance_risk")) {
    safaricomReasons[4] = {
      ...safaricomReasons[4],
      body: safaricomReasons[4].body + " Given this SACCO's compliance challenges, SASRA returns will be generated automatically — no manual compilation required.",
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> Why Safaricom
        </p>
        <div className="space-y-3">
          {safaricomReasons.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                {r.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t" />

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" /> Why MySACCO
        </p>
        <div className="space-y-3">
          {mySACCOReasons.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                {r.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    submitted: "bg-blue-100 text-blue-700 border-blue-200",
    reviewed: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border capitalize ${map[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

// ─── Main Report Page ─────────────────────────────────────────────────────────

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: assessment, isLoading } = useQuery<Assessment>({
    queryKey: ["/api/assessments", id],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/assessments/${id}`);
      return r.json();
    },
    enabled: !!id,
  });

  // Presales editable fields
  const [editNotes, setEditNotes] = useState<string | null>(null);
  const [editNextSteps, setEditNextSteps] = useState<string | null>(null);
  const [editModel, setEditModel] = useState<string | null>(null);
  const [editPwin, setEditPwin] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/assessments/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/assessments", id] });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    },
    onSettled: () => setIsSaving(false),
  });

  const downloadPDF = async () => {
    const el = pdfRef.current;
    if (!el) return;
    setIsPdfLoading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 900,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let yPos = 0;
      let remaining = imgH;
      while (remaining > 0) {
        if (yPos > 0) pdf.addPage();
        const srcY = (yPos / imgH) * canvas.height;
        const sliceH = Math.min(pageH, remaining);
        const slicePx = (sliceH / imgH) * canvas.height;
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = slicePx;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, imgW, sliceH);
        yPos += sliceH;
        remaining -= sliceH;
      }
      const saccoName = ((assessment?.saccoName) || "MySACCO-Report").replace(/\s+/g, "-");
      pdf.save(`${saccoName}-Report.pdf`);
    } catch (e) {
      console.error("PDF export error", e);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  if (isLoading || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Resolved values
  const model = assessment.recommendedModel || "full_stack";
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.full_stack;
  const complexity = assessment.complexityRating || "standard";
  const readinessScore = computeReadinessScore(assessment);
  const techScore = assessment.techProficiencyScore || 0;
  const accScore = assessment.accountingProficiencyScore || 0;

  const painPoints = parseArr(assessment.painPoints);
  const outcomes = parseArr(assessment.desiredOutcomes);
  const specialLoans = parseArr(assessment.specialLoanProducts);
  const specialLoansOther: string[] = (() => {
    try { return JSON.parse((assessment as any).specialLoanProductsOther || "[]"); } catch { return []; }
  })();
  const complaints = parseArr(assessment.memberComplaintTypes);
  const digitalFeatures = parseArr(assessment.digitalChannelFeatures);
  const topPriorities = parseTopPriority(assessment.topPriority);

  // Availability slots
  interface AvailabilitySlotObj { date: string; slots: string[] }
  const availabilitySlots: AvailabilitySlotObj[] = (() => {
    try {
      const raw = JSON.parse(assessment.availabilitySlots || "[]");
      if (!Array.isArray(raw)) return [];
      // Accept both {date, slots:[]} and legacy {date, time} formats
      return raw.map((item: any) => {
        if (typeof item.date === "string" && Array.isArray(item.slots)) return item as AvailabilitySlotObj;
        if (typeof item.date === "string" && typeof item.time === "string") {
          return { date: item.date, slots: [item.time] };
        }
        return null;
      }).filter(Boolean) as AvailabilitySlotObj[];
    } catch { return []; }
  })();

  // Group availability slots by date
  const groupedSlots: Record<string, string[]> = {};
  for (const entry of availabilitySlots) {
    if (!groupedSlots[entry.date]) groupedSlots[entry.date] = [];
    groupedSlots[entry.date] = [...groupedSlots[entry.date], ...entry.slots];
  }

  // Revenue breakdown
  const revBreakdown = parseObj((assessment as any).estimatedRevenueBreakdown);
  const subRevenue = revBreakdown.subscription || pricing.annual;
  const loanRevenue = revBreakdown.loans || 0;
  const withdrawalRevenue = revBreakdown.withdrawals || 0;
  const totalRevenue = assessment.estimatedRevenue || subRevenue;

  const urgencyInfo = URGENCY_LABELS[assessment.solutionUrgency || ""] || null;
  const pwin = assessment.pwinScore ?? null;

  function handleSave() {
    setIsSaving(true);
    const payload: Record<string, unknown> = {};
    if (editNotes !== null) payload.presalesNotes = editNotes;
    if (editNextSteps !== null) payload.nextSteps = editNextSteps;
    if (editModel !== null) payload.recommendedModel = editModel;
    if (editPwin !== null) payload.pwinScore = editPwin === "" ? null : parseInt(editPwin, 10);
    saveMutation.mutate(payload);
  }

  const displayNotes = editNotes !== null ? editNotes : (assessment.presalesNotes || "");
  const displayNextSteps = editNextSteps !== null ? editNextSteps : (assessment.nextSteps || "");
  const displayModel = editModel !== null ? editModel : model;
  const displayPwin = editPwin !== null ? editPwin : (pwin !== null ? String(pwin) : "");

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .min-h-screen { min-height: 0 !important; }
        }
      `}</style>

      {/* ── Header bar ── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-card border-b px-4 py-3 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <span className="font-semibold text-sm truncate max-w-[200px]">{assessment.saccoName || "SACCO Report"}</span>
            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{assessment.accessCode}</code>
            <StatusBadge status={assessment.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground hidden sm:block font-mono bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded">
              Confidential — Safaricom PreSales Team
            </span>
            {assessment.submittedAt && (
              <span className="text-xs text-muted-foreground hidden md:block">
                {new Date(assessment.submittedAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={downloadPDF} disabled={isPdfLoading}>
              {isPdfLoading
                ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                : <FileDown className="h-4 w-4 mr-1" />}
              {isPdfLoading ? "Generating…" : "PDF"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </header>

      <div ref={pdfRef} className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Report title block ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="font-mono bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-1.5 py-0.5 rounded text-[11px]">
              CONFIDENTIAL — Safaricom PreSales Internal
            </span>
            <span>·</span>
            <code className="font-mono">{assessment.accessCode}</code>
            {assessment.submittedAt && (
              <>
                <span>·</span>
                <span>Submitted {new Date(assessment.submittedAt).toLocaleDateString("en-KE", { dateStyle: "long" })}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold">{assessment.saccoName || "SACCO Lead"}</h1>
          <p className="text-sm text-muted-foreground">Pre-Sales Intelligence Report — Safaricom MySACCO</p>
          <div className="flex flex-wrap gap-2 items-center mt-1">
            <Badge variant="outline">{assessment.saccoType || "SACCO"}</Badge>
            {assessment.county && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{assessment.county}</Badge>}
            {assessment.industry && <Badge variant="outline">{assessment.industry.replace(/_/g, " ")}</Badge>}
            {assessment.sasraLicensed === "yes" && <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">SASRA Licensed</Badge>}
            {assessment.sasraLicensed === "pending" && <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">SASRA Pending</Badge>}
            <StatusBadge status={assessment.status} />
          </div>
        </div>

        {/* ── SECTION 1: Executive Summary strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: Users,
              label: "Members",
              value: MEMBER_RANGES[assessment.totalMembers || ""] || assessment.totalMembers || "—",
              color: "text-blue-600",
            },
            {
              icon: Building2,
              label: "SACCO Type",
              value: assessment.saccoType || "—",
              color: "text-primary",
            },
            {
              icon: ShieldCheck,
              label: "SASRA",
              value: assessment.sasraLicensed === "yes" ? "Licensed ✓" : assessment.sasraLicensed === "pending" ? "Pending" : "Not Licensed",
              color: assessment.sasraLicensed === "yes" ? "text-green-600" : "text-muted-foreground",
            },
            {
              icon: MapPin,
              label: "County",
              value: assessment.county || "—",
              color: "text-muted-foreground",
            },
            {
              icon: Zap,
              label: "Urgency",
              value: urgencyInfo?.label?.split(" — ")[0] || assessment.solutionUrgency || "—",
              color: urgencyInfo?.color || "text-muted-foreground",
            },
            {
              icon: Activity,
              label: "PWIN",
              value: pwin !== null ? `${pwin}%` : "—",
              color: pwin !== null && pwin >= 70 ? "text-green-600" : pwin !== null && pwin >= 40 ? "text-amber-600" : "text-muted-foreground",
            },
            {
              icon: Layers,
              label: "Recommended Model",
              value: MODEL_LABELS[model]?.split(" ")[0] + (MODEL_LABELS[model]?.includes("(") ? " (Full)" : "") || model,
              color: "text-primary",
            },
            {
              icon: DollarSign,
              label: "Est. Revenue / yr",
              value: formatKES(totalRevenue),
              color: "text-green-600",
            },
          ].map((m) => (
            <Card key={m.label} className="border">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                  <span className="text-[11px] text-muted-foreground">{m.label}</span>
                </div>
                <div className={`font-semibold text-sm leading-tight ${m.color}`}>{m.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Two-column main layout ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* SECTION 2 — SACCO Identity & Contact */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">SACCO Identity & Contact</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {/* Contact details */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Contact Person</div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="font-medium">{assessment.contactPersonName || "—"}</div>
                        {assessment.contactPersonTitle && <div className="text-xs text-muted-foreground">{assessment.contactPersonTitle}</div>}
                      </div>
                    </div>
                    {assessment.contactEmail && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <a href={`mailto:${assessment.contactEmail}`} className="hover:text-foreground transition-colors">{assessment.contactEmail}</a>
                      </div>
                    )}
                    {assessment.contactPhone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        {assessment.contactPhone}
                      </div>
                    )}
                    {assessment.county && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {assessment.county} County
                      </div>
                    )}
                  </div>

                  {/* SACCO characteristics */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">SACCO Profile</div>
                    {[
                      ["Industry", assessment.industry === "other" ? (assessment.industryOther || "Other") : assessment.industry?.replace(/_/g, " ")],
                      ["SACCO Type", assessment.saccoType],
                      ["SASRA Licensed", assessment.sasraLicensed === "yes" ? "Yes ✓" : assessment.sasraLicensed === "pending" ? "Pending" : "No"],
                      ["FOSA", assessment.hasFosa === "yes" ? "Yes" : "No"],
                      ["BOSA", assessment.hasBosa === "yes" ? "Yes" : "No"],
                      ["Total Members", MEMBER_RANGES[assessment.totalMembers || ""] || assessment.totalMembers],
                      ["Growth Rate", assessment.memberGrowthRate?.replace(/_/g, " ")],
                    ].map(([k, v]) => v && (
                      <div key={k} className="flex justify-between text-xs border-b border-dashed border-border pb-1.5">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 3 — Digital Readiness */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Digital Readiness</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ReadinessGauge score={readinessScore} max={10} />
                <ReadinessNarrative assessment={assessment} />

                {/* Score breakdown */}
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="font-medium mb-2">Tech Proficiency — {techScore}/10</div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${techScore >= 7 ? "bg-green-500" : techScore >= 4 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${(techScore / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-1.5">
                      {techScore >= 7 ? "High digital maturity — minimal IT training required." : techScore >= 4 ? "Moderate maturity — training and change management needed." : "Low maturity — extended onboarding support required."}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="font-medium mb-2">Accounting Proficiency — {accScore}/10</div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${accScore >= 7 ? "bg-green-500" : accScore >= 4 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${(accScore / 10) * 100}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-1.5">
                      {accScore >= 7 ? "Strong accounting structure. CoA migration straightforward." : accScore >= 4 ? "Moderate — some CoA work and reconciliation training." : "Low — full accounting setup from scratch required."}
                    </p>
                  </div>
                </div>

                {/* Current digital channels */}
                {(digitalFeatures.length > 0 || assessment.hasMobileApp === "yes" || assessment.hasUssd === "yes" || assessment.hasWebPortal === "yes") && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Digital Channels</div>
                    <div className="flex flex-wrap gap-1.5">
                      {assessment.hasMobileApp === "yes" && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-0.5">
                          Mobile App
                        </span>
                      )}
                      {assessment.hasUssd === "yes" && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-0.5">
                          USSD
                        </span>
                      )}
                      {assessment.hasWebPortal === "yes" && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-0.5">
                          Web Portal
                        </span>
                      )}
                      {digitalFeatures.map((f) => (
                        <span key={f} className="text-xs bg-muted border border-border rounded-full px-2.5 py-0.5">
                          {DIGITAL_FEATURE_LABELS[f] || f.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    {assessment.digitalChannelsAge && (
                      <p className="text-xs text-muted-foreground">Digital channels age: {assessment.digitalChannelsAge.replace(/_/g, " ")}</p>
                    )}
                  </div>
                )}

                {/* Digital adoption & paybill */}
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  {assessment.memberDigitalAdoptionRate && (
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span className="text-muted-foreground">Member Digital Adoption</span>
                      <span className="font-medium">{assessment.memberDigitalAdoptionRate.replace(/_/g, " ").replace("percent", "%")}</span>
                    </div>
                  )}
                  {assessment.expectedDigitalTraffic && (
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span className="text-muted-foreground">Expected Digital Traffic</span>
                      <span className="font-medium">{assessment.expectedDigitalTraffic.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  {assessment.existingPaybill === "yes" && assessment.paybillNumber && (
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span className="text-muted-foreground">Paybill Number</span>
                      <span className="font-medium font-mono">{assessment.paybillNumber}</span>
                    </div>
                  )}
                  {assessment.onboardsViaDigital && (
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span className="text-muted-foreground">Onboards via Digital</span>
                      <span className="font-medium capitalize">{assessment.onboardsViaDigital}</span>
                    </div>
                  )}
                  {assessment.paybillOneAccount && assessment.existingPaybill === "yes" && (
                    <div className="flex justify-between border-b border-dashed pb-1.5">
                      <span className="text-muted-foreground">One-Account Configured</span>
                      <span className={`font-medium ${assessment.paybillOneAccount === "yes" ? "text-green-600" : "text-amber-600"}`}>
                        {assessment.paybillOneAccount === "yes" ? "Yes ✓" : "No — setup required"}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 4 — Technology Stack */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Technology Stack</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                  {[
                    ["Core Banking System", cbsLabel(assessment)],
                    ["CBS Age", assessment.coreSystemAge?.replace(/_/g, " ")],
                    ["Vendor Relationship", assessment.hasVendorRelationship === "yes" ? (assessment.vendorName || "Yes") : "No"],
                    ["Vendor Can Assist", assessment.vendorCanAssist?.replace(/_/g, " ")],
                    ["Sandbox Environment", assessment.hasSandbox === "yes" ? "Available ✓" : assessment.hasSandbox === "no" ? "Not available" : "Unknown"],
                    ["IT Staff Count", assessment.itStaffCount],
                    ["Mobile App", assessment.hasMobileApp === "yes" ? "Yes" : "No"],
                    ["USSD", assessment.hasUssd === "yes" ? "Yes" : "No"],
                    ["Web Portal", assessment.hasWebPortal === "yes" ? "Yes" : "No"],
                  ].map(([k, v]) => v && (
                    <div key={k} className="flex justify-between text-xs border-b border-dashed border-border pb-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
                {assessment.hasVendorRelationship === "yes" && assessment.vendorName && (
                  <div className="mt-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs">
                    <span className="font-semibold text-amber-700 dark:text-amber-300">Vendor: </span>
                    <span className="text-amber-700 dark:text-amber-300">{assessment.vendorName}</span>
                    {assessment.vendorCanAssist && (
                      <span className="text-muted-foreground ml-1">— {assessment.vendorCanAssist === "vendor" ? "Vendor will assist deployment" : assessment.vendorCanAssist === "sacco_self" ? "SACCO IT team leads" : assessment.vendorCanAssist === "safaricom" ? "Safaricom Professional Services" : assessment.vendorCanAssist}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 5 — Financial Proficiency */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Financial Proficiency</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs">
                  {[
                    ["Accounting System", assessment.accountingSystem?.replace(/_/g, " ")],
                    [
                      "Chart of Accounts",
                      assessment.chartOfAccountsSetup === "fully_setup"
                        ? "Fully Configured ✓"
                        : assessment.chartOfAccountsSetup === "partial"
                        ? "Partial — needs completion"
                        : assessment.chartOfAccountsSetup === "none"
                        ? "Not started — setup required"
                        : assessment.chartOfAccountsSetup,
                    ],
                    [
                      "Reconciliation Frequency",
                      assessment.reconciliationFrequency === "daily"
                        ? "Daily ✓"
                        : assessment.reconciliationFrequency === "weekly"
                        ? "Weekly"
                        : assessment.reconciliationFrequency === "monthly"
                        ? "Monthly"
                        : assessment.reconciliationFrequency === "rarely" || assessment.reconciliationFrequency === "ad_hoc"
                        ? "Rarely / Ad-hoc ⚠"
                        : assessment.reconciliationFrequency,
                    ],
                    [
                      "SASRA Reporting",
                      assessment.sasraLicensed === "yes"
                        ? assessment.sasraReportingCapability === "automated"
                          ? "Automated ✓"
                          : assessment.sasraReportingCapability === "manual"
                          ? "Manual — automation needed"
                          : assessment.sasraReportingCapability === "none"
                          ? "None — capability gap"
                          : assessment.sasraReportingCapability || "N/A"
                        : "Not applicable",
                    ],
                    ["Finance Staff Count", assessment.financialStaffCount],
                    ["Accounting Score", `${accScore}/10`],
                  ].map(([k, v]) => v && (
                    <div key={k} className="flex justify-between border-b border-dashed border-border pb-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className={`font-medium text-right ${
                        String(v).includes("✓") ? "text-green-600 dark:text-green-400" :
                        String(v).includes("⚠") ? "text-amber-600 dark:text-amber-400" : ""
                      }`}>{v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SECTION 6 — Pain Points & Needs */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">Pain Points & Needs</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Top Priorities */}
                {topPriorities.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Priorities (Ranked)</div>
                    <ol className="space-y-2">
                      {topPriorities.map((v, i) => {
                        const label = TOP_PRIORITY_LABELS[v] || PAIN_LABELS[v] || v.replace(/_/g, " ");
                        return (
                          <li key={v + i} className="flex items-center gap-2.5 text-sm">
                            <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : i === 1 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {i + 1}
                            </span>
                            <span className={i === 0 ? "font-semibold" : ""}>{label}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}

                {/* Pain Points */}
                {painPoints.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Identified Pain Points</div>
                    <div className="flex flex-wrap gap-1.5">
                      {painPoints.map((p) => (
                        <span key={p} className="text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded px-2 py-0.5">
                          {PAIN_LABELS[p] || p.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    {assessment.painPointsOther && (
                      <p className="text-xs text-muted-foreground mt-1.5">Other: {assessment.painPointsOther}</p>
                    )}
                  </div>
                )}

                {/* Member Complaints */}
                {complaints.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Member Complaint Types</div>
                    <ul className="space-y-1.5">
                      {complaints.map((c) => (
                        <li key={c} className="flex items-center gap-2 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                          {MEMBER_COMPLAINT_LABELS[c] || c.replace(/_/g, " ")}
                        </li>
                      ))}
                    </ul>
                    {assessment.memberComplaintsOther && (
                      <p className="text-xs text-muted-foreground mt-1.5">Other: {assessment.memberComplaintsOther}</p>
                    )}
                  </div>
                )}

                {/* Desired Outcomes */}
                {outcomes.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Desired Outcomes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {outcomes.map((o) => (
                        <span key={o} className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded px-2 py-0.5">
                          {DESIRED_OUTCOME_LABELS[o] || o.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                    {assessment.desiredOutcomesOther && (
                      <p className="text-xs text-muted-foreground mt-1.5">Other: {assessment.desiredOutcomesOther}</p>
                    )}
                  </div>
                )}

                {/* Special Loan Products */}
                {(specialLoans.length > 0 || specialLoansOther.length > 0) && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Special Loan Products</div>
                    <div className="flex flex-wrap gap-1.5">
                      {specialLoans.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{LOAN_LABELS[s] || s.replace(/_/g, " ")}</Badge>
                      ))}
                      {specialLoansOther.map((s, i) => (
                        <Badge key={"o" + i} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Context */}
                {assessment.additionalContext && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Additional Context</div>
                    <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">{assessment.additionalContext}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 7 — SWOT Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">SWOT Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  A snapshot of where {assessment.saccoName || "this SACCO"} stands today — and where MySACCO fits in.
                </p>
                <SWOTAnalysis assessment={assessment} />
              </CardContent>
            </Card>

            {/* SECTION 8 — Deployment Requirements */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Deployment Requirements</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs">
                  {[
                    [
                      "Data Migration",
                      assessment.requiresDataMigration === "yes"
                        ? `Required — ${assessment.dataMigrationComplexity?.replace(/_/g, " ") || "complexity TBD"}`
                        : assessment.requiresDataMigration === "unsure"
                        ? "TBD — assessment needed"
                        : "Not required",
                      assessment.requiresDataMigration === "yes"
                        ? assessment.dataMigrationComplexity === "complex"
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-400"
                        : "text-green-600 dark:text-green-400",
                    ],
                    [
                      "Custom Integration",
                      assessment.requiresCustomIntegration === "yes"
                        ? "Required"
                        : assessment.requiresCustomIntegration === "unsure"
                        ? "TBD"
                        : "Not required",
                      assessment.requiresCustomIntegration === "yes" ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400",
                    ],
                    [
                      "API Documentation",
                      assessment.hasApiDocumentation === "yes"
                        ? "Available ✓"
                        : assessment.hasApiDocumentation === "partial"
                        ? "Partial"
                        : "Not available — must be obtained",
                      assessment.hasApiDocumentation === "yes" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
                    ],
                    [
                      "Custom Branding",
                      assessment.requiresCustomBranding === "yes" ? "Required — brand assets needed" : "Standard MySACCO branding",
                      "text-foreground",
                    ],
                    [
                      "Complexity Rating",
                      COMPLEXITY_LABELS[complexity] || complexity,
                      complexity === "highly_complex" ? "text-red-600 dark:text-red-400" : complexity === "complex" ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400",
                    ],
                    [
                      "Preferred Rollout Timeline",
                      TIMELINE_LABELS[assessment.preferredRolloutTimeline || ""] || assessment.preferredRolloutTimeline || "—",
                      "text-foreground",
                    ],
                  ].map(([k, v, cls]) => (
                    <div key={k} className="flex justify-between border-b border-dashed border-border pb-1.5">
                      <span className="text-muted-foreground">{k}</span>
                      <span className={`font-medium text-right ${cls}`}>{v}</span>
                    </div>
                  ))}
                </div>

                {assessment.requiresCustomIntegration === "yes" && assessment.integrationDetails && (
                  <div className="bg-muted/40 rounded-lg p-3 text-sm">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Integration Details</div>
                    <p className="text-muted-foreground leading-relaxed">{assessment.integrationDetails}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 9 — Recommended Model & Revenue */}
            <Card className="border-primary/30 bg-green-50/30 dark:bg-green-900/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Recommended Model & Revenue</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Model */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-sm px-3 py-1 bg-primary text-primary-foreground">{MODEL_LABELS[model]}</Badge>
                    <Badge variant="outline">{COMPLEXITY_LABELS[complexity]} Complexity</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{MODEL_DESCRIPTIONS[model]}</p>

                  {/* Comparison */}
                  <div className="border rounded-lg overflow-hidden text-xs mt-3">
                    <div className="grid grid-cols-3 font-medium bg-muted/60 p-2 text-center text-muted-foreground">
                      <div>Front-End Only</div>
                      <div>Back-End Only</div>
                      <div>Full Stack</div>
                    </div>
                    <div className="grid grid-cols-3 p-2 text-center border-t">
                      {["front_end_only", "back_end_only", "full_stack"].map((m2) => (
                        <div key={m2} className={`py-1.5 rounded ${m2 === model ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"}`}>
                          {formatKES(MODEL_PRICING[m2].monthly)}/mo
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 p-2 text-center border-t text-muted-foreground text-[10px]">
                      <div>+ KES 15/withdrawal</div>
                      <div>+ 1% on loans</div>
                      <div>+ 1% loans + KES 15/withdrawal</div>
                    </div>
                  </div>
                </div>

                {/* Revenue breakdown */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Annual Revenue Estimate
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Subscription ({formatKES(pricing.monthly)}/mo × 12)</span>
                      <span className="font-medium">{formatKES(subRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Loan commissions (1%, capped KES 3,000/loan)</span>
                      <span className="font-medium">{formatKES(loanRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Withdrawal fees (KES 15/txn est.)</span>
                      <span className="font-medium">{formatKES(withdrawalRevenue)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total Annual Revenue Potential</span>
                      <span className="text-primary text-base">{formatKES(totalRevenue)}</span>
                    </div>
                  </div>
                  <div className="px-4 pb-3 text-[10px] text-muted-foreground">
                    Estimates based on declared member count, loan volume, and digital adoption rate. Actuals will vary.
                  </div>
                </div>

                {/* PWIN */}
                {pwin !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">PWIN Score (Probability of Win)</span>
                      <span className={`font-bold text-lg ${pwin >= 70 ? "text-green-600" : pwin >= 40 ? "text-amber-600" : "text-red-600"}`}>
                        {pwin}%
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pwin >= 70 ? "bg-green-500" : pwin >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${pwin}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pwin >= 70 ? "High probability of winning this deal. Prioritise resources and fast-track proposal." : pwin >= 40 ? "Moderate probability. Nurture with tailored demo and proposal." : "Lower probability. Identify blockers and address objections."}
                    </p>
                  </div>
                )}

                {/* Urgency */}
                {urgencyInfo && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${
                    assessment.solutionUrgency === "critical"
                      ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                      : assessment.solutionUrgency === "high"
                      ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800"
                      : "bg-muted/40 border-border"
                  }`}>
                    <div className={`font-semibold mb-1 ${urgencyInfo.color}`}>
                      <Zap className="h-4 w-4 inline mr-1.5" />
                      {urgencyInfo.label}
                    </div>
                    <p className="text-xs text-muted-foreground">{urgencyInfo.advice}</p>
                    {assessment.preferredRolloutTimeline && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Preferred go-live: {TIMELINE_LABELS[assessment.preferredRolloutTimeline] || assessment.preferredRolloutTimeline}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 10 — Availability Slots */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Availability Slots</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedSlots).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No availability slots selected yet by this SACCO.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groupedSlots)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, times]) => {
                        const d = new Date(date + "T12:00:00");
                        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const label = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                        const timeLabels: Record<string, string> = {
                          "08:00": "8:00 AM", "09:00": "9:00 AM", "10:00": "10:00 AM",
                          "11:00": "11:00 AM", "12:00": "12:00 PM", "13:00": "1:00 PM",
                          "14:00": "2:00 PM", "15:00": "3:00 PM", "16:00": "4:00 PM", "17:00": "5:00 PM",
                        };
                        return (
                          <div key={date} className="border rounded-lg p-3">
                            <div className="font-medium text-sm flex items-center gap-2 mb-2">
                              <CalendarDays className="h-4 w-4 text-primary" />
                              {label}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {times.sort().map((t) => (
                                <span key={t} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {timeLabels[t] || t}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 11 — Pre-Sales Notes & Next Steps */}
            <Card className="no-print">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Pre-Sales Notes & Next Steps</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recommended Model selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommended Model</label>
                  <select
                    value={displayModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {Object.entries(MODEL_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* PWIN */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PWIN Score (0–100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={displayPwin}
                    onChange={(e) => setEditPwin(e.target.value)}
                    placeholder="e.g. 75"
                    className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Presales Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pre-Sales Notes</label>
                  <Textarea
                    value={displayNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add internal notes, observations, deal context…"
                    rows={4}
                    className="text-sm resize-y"
                  />
                </div>

                {/* Next Steps */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Steps</label>
                  <Textarea
                    value={displayNextSteps}
                    onChange={(e) => setEditNextSteps(e.target.value)}
                    placeholder="e.g. Schedule demo call, send proposal, follow up on sandbox access…"
                    rows={3}
                    className="text-sm resize-y"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : savedOk
                    ? <CheckCircle className="h-4 w-4" />
                    : <Save className="h-4 w-4" />}
                  {isSaving ? "Saving…" : savedOk ? "Saved!" : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* SECTION 12 — Why Safaricom + Why MySACCO */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Why Safaricom & MySACCO</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <WhySafaricomMySACCO assessment={assessment} />
              </CardContent>
            </Card>

          </div>

          {/* ── RIGHT SIDEBAR (1/3) ── */}
          <div className="space-y-5">

            {/* Contact card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <div className="font-semibold">{assessment.contactPersonName || "—"}</div>
                  {assessment.contactPersonTitle && <div className="text-xs text-muted-foreground">{assessment.contactPersonTitle}</div>}
                </div>
                {assessment.contactEmail && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <a href={`mailto:${assessment.contactEmail}`} className="hover:text-foreground">{assessment.contactEmail}</a>
                  </div>
                )}
                {assessment.contactPhone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    {assessment.contactPhone}
                  </div>
                )}
                {assessment.county && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {assessment.county} County
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue Potential */}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" /> Revenue Potential
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-primary">{formatKES(totalRevenue)}</div>
                  <div className="text-xs text-muted-foreground">Estimated annual revenue</div>
                </div>
                <div className="space-y-1.5 text-xs border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subscription</span>
                    <span className="font-medium">{formatKES(subRevenue)}/yr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loan commissions</span>
                    <span className="font-medium">{formatKES(loanRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Withdrawal fees</span>
                    <span className="font-medium">{formatKES(withdrawalRevenue)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatKES(totalRevenue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PWIN Sidebar */}
            {pwin !== null && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> PWIN Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className={`text-3xl font-bold ${pwin >= 70 ? "text-green-600" : pwin >= 40 ? "text-amber-600" : "text-red-600"}`}>
                    {pwin}%
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pwin >= 70 ? "bg-green-500" : pwin >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${pwin}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">Probability of win</div>
                </CardContent>
              </Card>
            )}

            {/* Urgency sidebar */}
            {urgencyInfo && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" /> Urgency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className={`text-sm font-semibold ${urgencyInfo.color}`}>{urgencyInfo.label}</div>
                  {assessment.preferredRolloutTimeline && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {TIMELINE_LABELS[assessment.preferredRolloutTimeline] || assessment.preferredRolloutTimeline}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground pt-1 leading-relaxed">{urgencyInfo.advice}</p>
                </CardContent>
              </Card>
            )}

            {/* Upcoming availability */}
            {Object.keys(groupedSlots).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" /> Next Available Slots
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(groupedSlots)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .slice(0, 3)
                      .map(([date, times]) => {
                        const d = new Date(date + "T12:00:00");
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                        return (
                          <div key={date} className="flex items-center gap-2 text-xs">
                            <span className="text-primary font-medium w-16 flex-shrink-0">
                              {dayNames[d.getDay()]} {d.getDate()} {monthNames[d.getMonth()]}
                            </span>
                            <span className="text-muted-foreground">{times.length} slot{times.length > 1 ? "s" : ""}</span>
                          </div>
                        );
                      })}
                    {Object.keys(groupedSlots).length > 3 && (
                      <p className="text-xs text-muted-foreground">+{Object.keys(groupedSlots).length - 3} more dates</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Onboarding Checklist */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" /> Onboarding Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-xs">
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
                    ...(assessment.requiresCustomBranding === "yes" ? ["SACCO brand assets (logo, colours)"] : []),
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Deployment flag */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Network className="h-4 w-4 text-primary" /> Deployment Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  {[
                    {
                      label: "Data Migration",
                      flag: assessment.requiresDataMigration === "yes"
                        ? assessment.dataMigrationComplexity === "complex" ? "red" : "amber"
                        : "green",
                      value: assessment.requiresDataMigration === "yes"
                        ? `Required (${assessment.dataMigrationComplexity || "TBD"})`
                        : "Not required",
                    },
                    {
                      label: "Custom Integration",
                      flag: assessment.requiresCustomIntegration === "yes" ? "amber" : "green",
                      value: assessment.requiresCustomIntegration === "yes" ? "Required" : "Not required",
                    },
                    {
                      label: "API Docs",
                      flag: assessment.hasApiDocumentation === "yes" ? "green" : assessment.hasApiDocumentation === "partial" ? "amber" : "red",
                      value: assessment.hasApiDocumentation === "yes" ? "Available" : assessment.hasApiDocumentation === "partial" ? "Partial" : "N/A",
                    },
                    {
                      label: "Sandbox",
                      flag: assessment.hasSandbox === "yes" ? "green" : "amber",
                      value: assessment.hasSandbox === "yes" ? "Available" : "Not available",
                    },
                    {
                      label: "Complexity",
                      flag: complexity === "highly_complex" ? "red" : complexity === "complex" ? "amber" : "green",
                      value: COMPLEXITY_LABELS[complexity] || complexity,
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`font-medium ${row.flag === "green" ? "text-green-600 dark:text-green-400" : row.flag === "amber" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4 pb-6">
          <div className="font-semibold text-foreground mb-1">MySACCO Pre-Sales Intelligence Report</div>
          <div>Safaricom Business — Confidential &nbsp;·&nbsp; {assessment.accessCode}</div>
          <div className="mt-1">Generated: {new Date().toLocaleDateString("en-KE", { dateStyle: "full" })}</div>
        </div>
      </div>
    </>
  );
}
