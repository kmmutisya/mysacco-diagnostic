import { useState, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CheckCircle, AlertCircle, PhoneCall, Printer, ChevronLeft,
  ChevronRight, Clock, CalendarDays, X, TrendingUp, Target,
  Building2, Users, Lightbulb, ListOrdered, Heart, Zap, Shield,
  ShieldCheck, Star, Award, Globe,
} from "lucide-react";
import type { Assessment } from "@shared/schema";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─── Label maps ───────────────────────────────────────────────────────────────

const PAIN_LABELS: Record<string, string> = {
  manual_processes: "Manual / paper-based processes",
  data_errors: "Data errors and record inconsistencies",
  poor_reporting: "Poor or slow financial reporting",
  no_digital_access: "Members lack digital account access",
  loan_processing: "Slow loan processing and approval",
  compliance: "Difficulty meeting SASRA compliance",
  security: "Security and fraud concerns",
  member_growth: "Inability to scale with growing membership",
  cost: "High operational running costs",
  poor_integration: "Disconnected systems",
  vendor_dependency: "Over-reliance on a single vendor",
  limited_products: "Limited financial product offerings",
};

const TOP_PRIORITY_LABELS: Record<string, string> = {
  digital_member_access:  "Give members digital self-service access (app / USSD)",
  replace_cbs:            "Replace or upgrade our core banking system",
  automate_loans:         "Speed up and automate loan processing",
  mpesa_integration:      "Integrate M-PESA for deposits and withdrawals",
  sasra_compliance:       "Achieve or improve SASRA regulatory compliance",
  eliminate_manual:       "Eliminate manual and paper-based processes",
  financial_reporting:    "Get real-time financial reports and dashboards",
  member_growth:          "Grow and retain our membership base",
  reduce_costs:           "Reduce operational costs",
  data_integrity:         "Fix data errors and improve record accuracy",
  cybersecurity:          "Strengthen security and reduce fraud risk",
  new_products:           "Launch new financial products for members",
  vendor_exit:            "Reduce dependency on our current vendor",
  staff_efficiency:       "Improve staff efficiency and reduce workload",
};

const OUTCOME_LABELS: Record<string, string> = {
  digital_channels: "Member self-service via mobile app and USSD",
  core_banking: "Modern, reliable core banking system",
  loan_automation: "Automated loan processing and approval",
  reporting: "Real-time financial dashboards and reporting",
  compliance_tools: "SASRA compliance and regulatory tools",
  mpesa_integration: "Seamless M-PESA integration for all transactions",
  analytics: "Analytics and business intelligence insights",
  credit_scoring: "Digital credit scoring for smarter lending",
  cybersecurity: "Cybersecurity controls and full audit trails",
  product_catalog: "Flexible product catalog for new offerings",
  cost_reduction: "Reduced day-to-day operational costs",
  member_growth_tools: "Tools to attract and onboard more members",
};

const URGENCY_LABELS: Record<string, string> = {
  critical: "Critical — top strategic priority, act now",
  high: "High — within the next 3 months",
  medium: "Medium — within 6 months",
  low: "Low — exploring future options",
};

const TIMELINE_LABELS: Record<string, string> = {
  immediate: "As soon as possible",
  "1-3months": "Within 1 – 3 months",
  "3-6months": "Within 3 – 6 months",
  "6months+": "6 months or more",
};

const MODEL_LABELS: Record<string, string> = {
  full_stack: "MySACCO Full Stack",
  front_end_only: "MySACCO Digital Channels",
  back_end_only: "MySACCO Core Platform",
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  full_stack:
    "A complete digital transformation — member-facing channels (mobile app, USSD, web portal) plus a modern core banking system. Best suited for SACCOs starting from scratch or replacing an outdated CBS.",
  front_end_only:
    "Powerful digital channels that connect to your existing core banking system via API. Ideal for SACCOs with a working CBS that need to give members digital self-service access.",
  back_end_only:
    "A robust core banking platform that handles all your back-office operations, SASRA reporting, and loan lifecycle management — with API-ready integration for any digital channels you already have.",
};

function parseArr(val: string | null | undefined): string[] {
  try { return JSON.parse(val || "[]"); } catch { return []; }
}

// ─── Digital Readiness Score Gauge ───────────────────────────────────────────

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

  function polar(angle: number, radius: number) {
    const rad = (angle * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  function arc(start: number, end: number, radius: number, strokeWidth: number, stroke: string) {
    const [x1, y1] = polar(start, radius);
    const [x2, y2] = polar(end, radius);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return (
      <path
        d={"M " + x1 + " " + y1 + " A " + radius + " " + radius + " 0 " + large + " 1 " + x2 + " " + y2}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  }

  return (
    <div className={"rounded-xl border p-5 " + bgColor + " print:bg-white print:border-gray-200"}>
      <div className="flex items-center gap-6">
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
          <p className={"text-xl font-bold mb-1 " + labelColor}>{label}</p>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: pct + "%", backgroundColor: color }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{pct}% readiness</p>
        </div>
      </div>
    </div>
  );
}

// ─── Personalised readiness explanation ──────────────────────────────────────

function ReadinessExplanation({ assessment }: { assessment: Assessment }) {
  const tech = assessment.techProficiencyScore || 0;
  const acc = assessment.accountingProficiencyScore || 0;
  const combined = Math.round((tech + acc) / 2);

  const hasCbs = !!(assessment.currentCoreSystem && assessment.currentCoreSystem !== "none" && assessment.currentCoreSystem !== "spreadsheets");
  const cbsName = assessment.currentCoreSystem && assessment.currentCoreSystem !== "none" && assessment.currentCoreSystem !== "spreadsheets"
    ? assessment.currentCoreSystem.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const hasMobileApp = assessment.hasMobileApp === "yes";
  const hasUssd = assessment.hasUssd === "yes";
  const hasItStaff = !!(assessment.itStaffCount && assessment.itStaffCount !== "0" && assessment.itStaffCount !== "none");
  const itCount = assessment.itStaffCount;
  const recFreq = assessment.reconciliationFrequency;
  const coa = assessment.chartOfAccountsSetup;
  const sasra = assessment.sasraLicensed;
  const cbsAge = assessment.coreSystemAge;
  const hasSandbox = assessment.hasSandbox === "yes";
  const hasFosa = assessment.hasFosa === "yes";
  const adoption = assessment.memberDigitalAdoptionRate;

  // Build personalised bullets
  const bullets: string[] = [];

  // CBS
  if (hasCbs && cbsName) {
    bullets.push("You are running " + cbsName + (cbsAge ? ", which has been in place for " + cbsAge.replace(/_/g, " ") : "") + " — this gives MySACCO a known integration starting point.");
  } else {
    bullets.push("You are currently managing operations without a dedicated core banking system, which means MySACCO will build you a clean, modern foundation from day one.");
  }

  // Digital channels
  if (hasMobileApp && hasUssd) {
    bullets.push("You already have both a mobile app and USSD in place" + (adoption ? " with " + adoption.replace(/_/g, " ").replace("percent", "%") + " member adoption" : "") + " — MySACCO will enhance and unify these channels.");
  } else if (hasMobileApp || hasUssd) {
    const ch = hasMobileApp ? "a mobile app" : "USSD access";
    bullets.push("You have " + ch + " running — MySACCO will complement and strengthen your existing digital touchpoint.");
  } else {
    bullets.push("Your members currently have no digital self-service access. MySACCO will introduce a mobile app and USSD, giving your members 24/7 account access from anywhere.");
  }

  // IT staff
  if (hasItStaff) {
    bullets.push("With " + (itCount === "1" ? "1 IT person" : itCount === "2-5" ? "2–5 IT staff" : "a well-staffed IT team") + " on board, your team is positioned to support the MySACCO rollout and ongoing maintenance.");
  } else {
    bullets.push("You currently have limited in-house IT capacity. Safaricom's deployment and support teams will fully manage the technical rollout and provide ongoing support.");
  }

  // FOSA
  if (hasFosa) {
    bullets.push("As a FOSA-enabled SACCO, you handle real-time member transactions — MySACCO's M-PESA integration and digital channels are directly designed for this.");
  }

  // Reconciliation
  if (recFreq === "daily" || recFreq === "weekly") {
    bullets.push("Your " + (recFreq === "daily" ? "daily" : "weekly") + " reconciliation cycle shows strong financial discipline — MySACCO will automate this process and reduce the manual effort significantly.");
  } else if (recFreq === "monthly") {
    bullets.push("Monthly reconciliation leaves gaps between your books and your bank. MySACCO's automated reconciliation engine will close this to real-time.");
  } else if (recFreq === "ad_hoc" || recFreq === "rarely") {
    bullets.push("Irregular reconciliation is a significant risk area. MySACCO automates this process, ensuring your books are always accurate and audit-ready.");
  }

  // Chart of accounts
  if (coa === "fully_setup") {
    bullets.push("Your chart of accounts is fully configured — MySACCO can import and map this directly, minimising setup time.");
  } else if (coa === "partial") {
    bullets.push("Your chart of accounts is partially set up. MySACCO's implementation team will complete and standardise this during onboarding.");
  } else if (coa === "none") {
    bullets.push("You do not yet have a chart of accounts. MySACCO includes a SACCO-standard chart of accounts out of the box, aligned with SASRA requirements.");
  }

  // SASRA
  if (sasra === "yes") {
    bullets.push("Being SASRA-licensed means you have regulatory reporting obligations. MySACCO's built-in compliance module generates all required returns automatically.");
  } else if (sasra === "pending") {
    bullets.push("You are pursuing SASRA licensing — MySACCO is built to be fully SASRA-compliant from day one, making your licensing journey smoother.");
  }

  // Sandbox
  if (hasSandbox) {
    bullets.push("Your vendor supports sandbox testing, which accelerates integration timelines and reduces go-live risk.");
  }

  const topBullets = bullets.slice(0, 4);

  // Opening sentence
  let opening = "";
  if (combined >= 7) {
    opening = (assessment.saccoName || "Your SACCO") + " has a strong digital foundation. The systems and processes you already have in place significantly reduce the complexity and cost of deploying MySACCO.";
  } else if (combined >= 4) {
    opening = (assessment.saccoName || "Your SACCO") + " has a solid base to build on. MySACCO will fill the key gaps in your current setup and the Safaricom team will provide full onboarding support throughout.";
  } else {
    opening = (assessment.saccoName || "Your SACCO") + " is at the start of its digital journey — and that is precisely the right time to act. MySACCO is designed to modernise SACCOs from the ground up, with Safaricom's full deployment and training support every step of the way.";
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-foreground leading-relaxed">{opening}</p>
      <ul className="space-y-2 mt-2">
        {topBullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── SWOT Analysis ────────────────────────────────────────────────────────────

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

  // Build SWOT
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
  if (painPoints.includes("manual_processes")) weaknesses.push("Heavy reliance on manual, paper-based processes");
  if (painPoints.includes("data_errors")) weaknesses.push("Data quality and record accuracy issues");
  if (painPoints.includes("vendor_dependency")) weaknesses.push("High dependency on existing technology vendor");
  if (cbsAge === "over_5_years" || cbsAge === "3_5_years") weaknesses.push("Ageing core banking system — technical debt accumulating");
  if (weaknesses.length === 0) weaknesses.push("Some operational processes still to be fully digitised");

  // Opportunities
  if (!hasMobileApp || !hasUssd) opportunities.push("Launch mobile and USSD channels to unlock member self-service");
  if (!hasPaybill || hasFosa) opportunities.push("M-PESA One-Account integration to eliminate manual withdrawal queues");
  if (growthRate === "fast" || growthRate === "moderate") opportunities.push("Leverage growing membership with scalable digital infrastructure");
  if (sasra === "pending") opportunities.push("SASRA licensing journey — MySACCO automates all required regulatory returns");
  if (painPoints.includes("loan_processing")) opportunities.push("Automate loan processing to dramatically reduce turnaround times");
  if (painPoints.includes("limited_products")) opportunities.push("Introduce new loan and savings products enabled by a modern platform");
  if (hasBosa) opportunities.push("Digitise BOSA savings products for member self-service contributions");
  if (painPoints.includes("poor_reporting")) opportunities.push("Real-time dashboards to give management instant financial visibility");
  opportunities.push("Safaricom ecosystem access — M-PESA, Lipa Na M-PESA, and future Safaricom innovations");
  if (opportunities.length > 5) opportunities.splice(5);

  // Threats
  if (painPoints.includes("security")) threats.push("Rising cyber threats and fraud risk in financial services");
  if (painPoints.includes("compliance")) threats.push("Increasing SASRA regulatory scrutiny and reporting requirements");
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
        <div key={q.title} className={"rounded-xl border p-4 " + q.bg + " " + q.border}>
          <div className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold mb-3 " + q.iconBg}>
            {q.icon}
            {q.title}
          </div>
          <ul className="space-y-1.5">
            {q.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-snug text-foreground/80">
                <span className={"mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 " + q.dotColor} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── SACCO Structure Summary Card ────────────────────────────────────────────

function SaccoStructureSummary({ assessment }: { assessment: Assessment }) {
  const painPoints = parseArr(assessment.painPoints);
  const outcomes = parseArr(assessment.desiredOutcomes);
  const topPriorityRanked: string[] = (() => {
    try {
      const p = JSON.parse(assessment.topPriority || "null");
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  })();
  const specialLoans = parseArr(assessment.specialLoanProducts);
  const specialLoansOther: string[] = (() => {
    try { return JSON.parse((assessment as any).specialLoanProductsOther || "[]"); } catch { return []; }
  })();
  const model = assessment.recommendedModel || "full_stack";

  const memberRanges: Record<string, string> = {
    "under_500": "under 500 members",
    "500-1000": "500 – 1,000 members",
    "1001-5000": "1,001 – 5,000 members",
    "5001-10000": "5,001 – 10,000 members",
    "10000+": "over 10,000 members",
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

  return (
    <div className="space-y-4">

      {/* Structure */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> How you are structured
        </p>
        <div className="flex flex-wrap gap-2">
          {assessment.saccoType && <Badge variant="outline" className="text-xs">{assessment.saccoType}</Badge>}
          {assessment.county && <Badge variant="outline" className="text-xs">{assessment.county}</Badge>}
          {assessment.industry && <Badge variant="outline" className="text-xs capitalize">{assessment.industry.replace(/_/g, " ")}</Badge>}
          {assessment.totalMembers && <Badge variant="outline" className="text-xs">{memberRanges[assessment.totalMembers] || assessment.totalMembers}</Badge>}
          {assessment.hasFosa === "yes" && <Badge variant="outline" className="text-xs">FOSA</Badge>}
          {assessment.hasBosa === "yes" && <Badge variant="outline" className="text-xs">BOSA</Badge>}
          {assessment.sasraLicensed === "yes" && <Badge variant="outline" className="text-xs border-green-300 text-green-700">SASRA Licensed</Badge>}
          {assessment.sasraLicensed === "pending" && <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">SASRA Pending</Badge>}
        </div>
      </div>

      {/* Needs and Pain Points */}
      {painPoints.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Key challenges
          </p>
          <ul className="space-y-1.5">
            {painPoints.map((p) => PAIN_LABELS[p] && (
              <li key={p} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {PAIN_LABELS[p]}
              </li>
            ))}
            {assessment.painPointsOther && (
              <li className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {assessment.painPointsOther}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Top Priority */}
      {topPriorityRanked.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ListOrdered className="h-3.5 w-3.5" /> Top priorities
          </p>
          <ol className="space-y-1.5">
            {topPriorityRanked.map((v, i) => (TOP_PRIORITY_LABELS[v] || PAIN_LABELS[v]) && (
              <li key={v} className="flex items-start gap-2.5 text-sm">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <span>{TOP_PRIORITY_LABELS[v] || PAIN_LABELS[v]}</span>
              </li>
            ))}
          </ol>
          {assessment.painPointsOther && (
            <p className="text-xs text-muted-foreground mt-2 italic">Also noted: {assessment.painPointsOther}</p>
          )}
        </div>
      )}

      {/* What they are looking for */}
      {outcomes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> What you are looking for
          </p>
          <div className="flex flex-wrap gap-1.5">
            {outcomes.map((o) => OUTCOME_LABELS[o] && (
              <span key={o} className="text-xs bg-primary/5 border border-primary/20 text-foreground rounded-full px-2.5 py-1">
                {OUTCOME_LABELS[o]}
              </span>
            ))}
            {assessment.desiredOutcomesOther && (
              <span className="text-xs bg-primary/5 border border-primary/20 text-foreground rounded-full px-2.5 py-1">
                {assessment.desiredOutcomesOther}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Special Loan Products */}
      {(specialLoans.length > 0 || specialLoansOther.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5" /> Special loan products
          </p>
          <div className="flex flex-wrap gap-1.5">
            {specialLoans.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{LOAN_LABELS[s] || s}</Badge>
            ))}
            {specialLoansOther.map((s, i) => (
              <Badge key={"o" + i} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* What they need — recommendation reasoning */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5" /> What you need
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          Based on your assessment, you need{" "}
          <span className="font-semibold">{MODEL_LABELS[model] || "MySACCO"}</span>.{" "}
          {MODEL_DESCRIPTIONS[model] || ""}
          {assessment.requiresDataMigration === "yes" && " Data migration from your existing system will be planned as part of the deployment."}
          {assessment.requiresCustomIntegration === "yes" && " Custom API integration with your current systems will be scoped during onboarding."}
          {assessment.requiresCustomBranding === "yes" && " Custom branding will be applied so the app carries your SACCO's identity."}
        </p>
      </div>
    </div>
  );
}

// ─── Why Safaricom + Why MySACCO ─────────────────────────────────────────────

function WhySafaricomMySACCO({ assessment }: { assessment: Assessment }) {
  const safaricomReasons = [
    {
      icon: <Globe className="h-4 w-4" />,
      title: "Kenya's most trusted brand",
      body: "Safaricom is the most trusted technology company in Kenya, with over 20 years of serving Kenyans across every county. Your SACCO's members already trust Safaricom.",
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: "Unmatched network & infrastructure",
      body: "Safaricom's network reaches over 97% of Kenya's population, with enterprise-grade uptime and infrastructure backing every solution it delivers.",
    },
    {
      icon: <Zap className="h-4 w-4" />,
      title: "M-PESA ecosystem advantage",
      body: "No other provider gives you native, real-time M-PESA integration. With MySACCO, deposits, withdrawals, and loan disbursements move instantly through M-PESA — the platform your members already use every day.",
    },
    {
      icon: <Users className="h-4 w-4" />,
      title: "Dedicated SACCO expertise",
      body: "Safaricom's MySACCO team combines deep SACCO domain knowledge with enterprise technology delivery — from presales diagnosis through deployment and long-term support.",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: "Regulatory alignment",
      body: "Safaricom works within Kenya's regulatory environment. MySACCO is built to meet SASRA requirements out of the box — so your compliance is never an afterthought.",
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
      body: "From the member's mobile app to your core banking back-end to SASRA regulatory reports — MySACCO covers the full stack. One vendor, one integration, one support team.",
    },
    {
      icon: <Zap className="h-4 w-4" />,
      title: "Rapid deployment",
      body: "MySACCO is designed for fast, low-disruption deployment. Most SACCOs go live within weeks, not months — with data migration, staff training, and member onboarding supported end to end.",
    },
    {
      icon: <Star className="h-4 w-4" />,
      title: "Affordable, scalable pricing",
      body: "MySACCO is priced for Kenyan SACCOs — not for multinational banks. Flexible subscription tiers grow with your membership, so you only pay for what you need.",
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: "Enterprise security at SACCO scale",
      body: "Full audit trails, role-based access controls, encrypted data, and fraud detection — the same security standards that protect Safaricom's enterprise customers, applied to your SACCO.",
    },
  ];

  // Add personalised touch based on their top priorities / pain
  const hasFosa = assessment.hasFosa === "yes";
  const painPoints = parseArr(assessment.painPoints);

  if (hasFosa) {
    mySACCOReasons[1].body += " For FOSA operations specifically, MySACCO handles real-time M-PESA withdrawals, deposits, and instant teller transactions.";
  }
  if (painPoints.includes("compliance")) {
    safaricomReasons[4].body += " Given your compliance challenges, this is especially relevant — your SASRA returns will be generated automatically, with no manual compilation required.";
  }

  return (
    <div className="space-y-6">
      {/* Why Safaricom */}
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

      {/* Why MySACCO */}
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

// ─── Availability Calendar ────────────────────────────────────────────────────

interface AvailabilitySlot {
  date: string;
  time: string;
  label: string;
}

const TIME_SLOTS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
];

function formatSlotLabel(dateStr: string, time: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dow = dayNames[d.getDay()];
  const day = d.getDate();
  const mon = monthNames[d.getMonth()];
  const t = TIME_SLOTS.find((s) => s.value === time)?.label || time;
  return dow + " " + day + " " + mon + " \u00b7 " + t;
}

function AvailabilityCalendar({ assessmentId, initialSlots }: { assessmentId: number; initialSlots: AvailabilitySlot[] }) {
  const qc = useQueryClient();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialSlots);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (newSlots: AvailabilitySlot[]) =>
      apiRequest("PATCH", "/api/assessments/" + assessmentId, {
        availabilitySlots: JSON.stringify(newSlots),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/assessments", String(assessmentId)] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onSettled: () => setSaving(false),
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const calDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(viewYear, viewMonth, d));
    return days;
  }, [viewYear, viewMonth]);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function toIso(d: Date): string {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function isPast(d: Date) { return d < today; }
  function isWeekend(d: Date) { return d.getDay() === 0 || d.getDay() === 6; }
  function hasSlots(dateStr: string) { return slots.some((s) => s.date === dateStr); }

  function toggleTimeSlot(time: string) {
    if (!selectedDate) return;
    const exists = slots.find((s) => s.date === selectedDate && s.time === time);
    const updated = exists
      ? slots.filter((s) => !(s.date === selectedDate && s.time === time))
      : [...slots, { date: selectedDate, time, label: formatSlotLabel(selectedDate, time) }];
    setSlots(updated);
  }

  function isSlotSelected(time: string) {
    return !!slots.find((s) => s.date === selectedDate && s.time === time);
  }

  function removeSlot(date: string, time: string) {
    setSlots((prev) => prev.filter((s) => !(s.date === date && s.time === time)));
  }

  function handleSave() { setSaving(true); saveMutation.mutate(slots); }

  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the dates and times that work for you. The Safaricom MySACCO team will use these to schedule a demo or discovery call.
      </p>

      <div className="border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
          <button type="button" onClick={prevMonth}
            disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold">{monthNames[viewMonth]} {viewYear}</p>
          <button type="button" onClick={nextMonth}
            disabled={viewYear === maxDate.getFullYear() && viewMonth === maxDate.getMonth()}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b bg-muted/20">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calDays.map((d, i) => {
            if (!d) return <div key={"e" + i} className="h-10" />;
            const iso = toIso(d);
            const disabled = isPast(d) || isWeekend(d) || d > maxDate;
            const hasSel = hasSlots(iso);
            const isSelected = selectedDate === iso;
            return (
              <button
                key={iso} type="button" disabled={disabled}
                onClick={() => setSelectedDate(isSelected ? null : iso)}
                className={"h-10 text-sm font-medium relative transition-colors border-t border-r last:border-r-0 " + (
                  disabled ? "text-muted-foreground/30 cursor-not-allowed"
                  : isSelected ? "bg-primary text-primary-foreground"
                  : hasSel ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                  : "hover:bg-muted/50"
                )}
              >
                {d.getDate()}
                {hasSel && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="border rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">
            <CalendarDays className="h-4 w-4 inline mr-1.5 text-primary" />
            {formatSlotLabel(selectedDate, "").split(" \u00b7")[0]} — pick available times
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {TIME_SLOTS.map((ts) => (
              <button key={ts.value} type="button" onClick={() => toggleTimeSlot(ts.value)}
                className={"rounded-lg border py-2 text-xs font-medium transition-all " + (
                  isSlotSelected(ts.value)
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/40 text-muted-foreground"
                )}>
                {ts.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {slots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your selected slots ({slots.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {[...slots].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map((s) => (
              <span key={s.date + "-" + s.time}
                className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                {s.label}
                <button type="button" onClick={() => removeSlot(s.date, s.time)}
                  className="hover:text-destructive transition-colors flex-shrink-0 ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || slots.length === 0} className="w-full gap-2" data-testid="button-save-availability">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          : saved ? <><CheckCircle className="h-4 w-4" /> Availability Saved</>
          : <><CalendarDays className="h-4 w-4" /> Confirm My Availability</>}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your selected slots will be shared with the Safaricom MySACCO team who will confirm a time with you.
      </p>
    </div>
  );
}

// ─── Main Scorecard Page ──────────────────────────────────────────────────────

export default function Scorecard() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  // ── All hooks must come before any conditional returns (Rules of Hooks) ──
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const { data: assessment, isLoading, isError } = useQuery<Assessment>({
    queryKey: ["/api/assessments", id],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/assessments/" + id);
      return r.json();
    },
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (isError || !assessment) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Scorecard Not Found</h2>
        <p className="text-muted-foreground">We could not load your scorecard. Please contact Safaricom.</p>
        <Button variant="outline" onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    </div>
  );

  const techScore = assessment.techProficiencyScore || 0;
  const accScore = assessment.accountingProficiencyScore || 0;
  const combinedScore = Math.round((techScore + accScore) / 2);

  const initialSlots: AvailabilitySlot[] = (() => {
    try { return JSON.parse(assessment.availabilitySlots || "[]"); } catch { return []; }
  })();

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
        windowWidth: 800,
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
      const saccoName = (assessment.saccoName || "MySACCO-Scorecard").replace(/\s+/g, "-");
      pdf.save(saccoName + "-Scorecard.pdf");
    } catch (e) {
      console.error("PDF export error", e);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { background: white !important; }
          .min-h-screen { min-height: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <header className="bg-primary text-primary-foreground px-4 py-3 no-print">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm">MySACCO</span>
              <span className="text-xs text-primary-foreground/70">by Safaricom Business</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary-foreground/70">Assessment Complete</span>
              <Button variant="secondary" size="sm"
                className="h-7 gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={downloadPDF} disabled={isPdfLoading} data-testid="button-print-scorecard">
                {isPdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} {isPdfLoading ? "Generating…" : "Export PDF"}
              </Button>
            </div>
          </div>
        </header>

        {/* Print header */}
        <div className="hidden print:block px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">MySACCO Needs Assessment — Scorecard</h1>
              <p className="text-sm text-gray-600">Safaricom Business · mysacco.safaricom.co.ke</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{assessment.saccoName}</p>
              <p>{new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
        </div>

        <div ref={pdfRef} className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {/* Hero */}
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Thank you, {assessment.saccoName || "your SACCO"}!</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Your MySACCO needs assessment is complete. Here is a personalised summary of your SACCO's profile and our recommendation.
              </p>
            </div>
          </div>

          {/* ── 1: Digital Readiness ── */}
          <Card data-testid="section-digital-readiness">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Your Digital Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReadinessGauge score={combinedScore} max={10} />
              <ReadinessExplanation assessment={assessment} />
            </CardContent>
          </Card>

          {/* ── 2: SACCO Profile ── */}
          <Card data-testid="section-sacco-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Your SACCO Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SaccoStructureSummary assessment={assessment} />
            </CardContent>
          </Card>

          {/* ── 3: SWOT Analysis ── */}
          <Card data-testid="section-swot">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                SWOT Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                A snapshot of where {assessment.saccoName || "your SACCO"} stands today — and where MySACCO fits in.
              </p>
              <SWOTAnalysis assessment={assessment} />
            </CardContent>
          </Card>

          {/* ── 4: Why Safaricom + Why MySACCO ── */}
          <Card data-testid="section-why">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Why Safaricom & MySACCO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WhySafaricomMySACCO assessment={assessment} />
            </CardContent>
          </Card>

          {/* ── 5: Timeline ── */}
          {(assessment.solutionUrgency || assessment.preferredRolloutTimeline) && (
            <Card data-testid="section-urgency">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Your Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {assessment.solutionUrgency && (
                  <div className="flex justify-between items-center border-b border-dashed border-border pb-2.5">
                    <span className="text-muted-foreground">Level of Urgency</span>
                    <span className="font-medium text-right">{URGENCY_LABELS[assessment.solutionUrgency] || assessment.solutionUrgency}</span>
                  </div>
                )}
                {assessment.preferredRolloutTimeline && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Preferred Go-Live</span>
                    <span className="font-medium text-right">{TIMELINE_LABELS[assessment.preferredRolloutTimeline] || assessment.preferredRolloutTimeline}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── 6: Availability Calendar ── */}
          <Card className="no-print" data-testid="section-availability">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Book Your Demo / Discovery Call
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar assessmentId={assessment.id} initialSlots={initialSlots} />
            </CardContent>
          </Card>

          {/* ── 7: CTA ── */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <PhoneCall className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">What happens next?</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The Safaricom MySACCO team will review your assessment and be in touch shortly. If you have booked availability slots above, they will use those to schedule a demo or discovery call.
                  </p>
                  {(assessment.contactPersonName || assessment.contactEmail) && (
                    <p className="text-xs text-muted-foreground pt-1">
                      We will reach out to {assessment.contactPersonName || "your contact"}{assessment.contactEmail ? " at " + assessment.contactEmail : ""}.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PDF export */}
          <div className="no-print text-center">
            <Button variant="outline" className="gap-2" onClick={downloadPDF} disabled={isPdfLoading} data-testid="button-print-scorecard-bottom">
              {isPdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {isPdfLoading ? "Generating PDF…" : "Download as PDF"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Your scorecard will download automatically as a PDF file.</p>
          </div>

          <div className="text-center text-xs text-muted-foreground border-t pt-4 pb-8">
            <div className="font-semibold text-foreground mb-1">Safaricom Business — MySACCO</div>
            <div>mysacco.safaricom.co.ke &nbsp;·&nbsp; 0722 000 000</div>
          </div>
        </div>
      </div>
    </>
  );
}
