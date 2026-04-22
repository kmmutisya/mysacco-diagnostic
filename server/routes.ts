import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
  TableCell, WidthType, AlignmentType, BorderStyle, ShadingType,
  convertInchesToTwip, PageOrientation,
} from "docx";

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MSC-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function computeTechScore(data: any): number {
  let score = 0;
  if (data.currentCoreSystem && data.currentCoreSystem !== "none" && data.currentCoreSystem !== "spreadsheets") score += 2;
  else if (data.currentCoreSystem === "spreadsheets") score += 1;
  if (data.hasMobileApp === "yes") score += 2;
  if (data.hasUssd === "yes") score += 1;
  if (data.hasWebPortal === "yes") score += 1;
  if (data.existingPaybill === "yes") score += 1;
  const itMap: Record<string, number> = { "0": 0, "1": 1, "2-5": 2, "5+": 3 };
  score += itMap[data.itStaffCount] || 0;
  const adoptMap: Record<string, number> = { "<20%": 0, "20-50%": 1, "50-80%": 2, "80%+": 3 };
  score += adoptMap[data.memberDigitalAdoptionRate] || 0;
  return Math.min(10, Math.round((score / 15) * 10));
}

function computeAccountingScore(data: any): number {
  let score = 0;
  const accMap: Record<string, number> = { manual: 1, spreadsheet: 2, standalone: 3, integrated: 4 };
  score += accMap[data.accountingSystem] || 0;
  if (data.chartOfAccountsSetup === "yes") score += 2;
  else if (data.chartOfAccountsSetup === "partial") score += 1;
  const reconMap: Record<string, number> = { daily: 3, weekly: 2, monthly: 1, rarely: 0 };
  score += reconMap[data.reconciliationFrequency] || 0;
  const sasraMap: Record<string, number> = { automated: 3, manual: 1, struggling: 0 };
  score += sasraMap[data.sasraReportingCapability] || 0;
  const staffMap: Record<string, number> = { "1": 0, "2-5": 1, "5+": 2 };
  score += staffMap[data.financialStaffCount] || 0;
  return Math.min(10, Math.round((score / 14) * 10));
}

function recommendModel(data: any): { model: string; reasoning: string; complexity: string } {
  const hasCoreSystem = data.currentCoreSystem && data.currentCoreSystem !== "none";
  const hasDigitalChannels = data.hasMobileApp === "yes" || data.hasUssd === "yes";
  const accScore = data.accountingProficiencyScore || 0;

  let model = "full_stack";
  let reasoning = "";
  let complexity = "standard";

  if (hasCoreSystem && !hasDigitalChannels) {
    model = "front_end_only";
    reasoning = "SACCO already has a back-end core banking system but lacks digital member-facing channels. MySACCO Front-End Channels will add mobile app (Android/iOS) and USSD access for members, integrating via API to their existing core banking platform.";
  } else if (hasDigitalChannels && accScore < 4) {
    model = "back_end_only";
    reasoning = "SACCO has existing digital member channels but struggles with back-end accounting and operations management. MySACCO Back-End Platform will modernise the core banking, accounting and reporting capabilities.";
  } else if (!hasCoreSystem && !hasDigitalChannels) {
    model = "full_stack";
    reasoning = "SACCO has neither a back-end system nor digital channels. The Full Stack MySACCO solution (Back-End Platform + Front-End Channels) is the ideal greenfield deployment for complete digital transformation.";
  } else if (hasCoreSystem && hasDigitalChannels) {
    model = "full_stack";
    reasoning = "SACCO has existing systems but both can be replaced and upgraded with MySACCO Full Stack for a consolidated, lower-cost, fully-integrated platform managed by Safaricom.";
  }

  // Complexity
  const complexityFlags: string[] = [];
  if (data.requiresDataMigration === "yes") complexityFlags.push("data migration");
  if (data.requiresCustomIntegration === "yes") complexityFlags.push("custom API integration");
  if (data.hasVendorRelationship === "yes") complexityFlags.push("existing vendor coordination");
  if ((data.specialLoanProducts || "[]").length > 50) complexityFlags.push("special loan products");
  if (data.vendorCanAssist === "safaricom") complexityFlags.push("professional services required");

  if (complexityFlags.length >= 3) complexity = "highly_complex";
  else if (complexityFlags.length >= 1) complexity = "complex";
  else complexity = "standard";

  return { model, reasoning, complexity };
}

function estimateRevenue(data: any, model: string): { subscription: number; loans: number; withdrawals: number; total: number } {
  const monthlySubscription: Record<string, number> = {
    front_end_only: 10000,
    back_end_only: 15000,
    full_stack: 20000,
  };
  const subMonthly = monthlySubscription[model] || 20000;
  const subAnnual = subMonthly * 12;

  // Loan commissions: 1% of avg loan size, capped at KES 3,000 per loan, × 12 months
  // Estimate monthly loan count and avg loan size from assessment bands
  const loanCountMap: Record<string, number> = {
    "<10": 5, "10-50": 30, "50-200": 125, "200-500": 350, "500+": 700,
  };
  const loanCount = loanCountMap[data.avgMonthlyLoans] || 30;

  // Estimate avg loan size from member count band
  const memberSizeMap: Record<string, number> = {
    "<500": 50000, "500-2000": 80000, "2000-10000": 150000,
    "10000-50000": 250000, "50000+": 500000,
  };
  const avgLoanSize = memberSizeMap[data.totalMembers] || 100000;
  const commissionPerLoan = Math.min(avgLoanSize * 0.01, 3000);
  const loanRevenue = Math.round(loanCount * commissionPerLoan * 12);

  // Withdrawal fees: estimate based on member count × digital adoption rate × KES 15 × 12 months
  // Assume each digitally-active member does ~2 withdrawals/month
  const memberCountMap: Record<string, number> = {
    "<500": 250, "500-2000": 1250, "2000-10000": 6000,
    "10000-50000": 30000, "50000+": 75000,
  };
  const memberCount = memberCountMap[data.totalMembers] || 1000;
  const adoptionMap: Record<string, number> = {
    "<20%": 0.10, "20-50%": 0.35, "50-80%": 0.65, "80%+": 0.85,
  };
  const adoption = adoptionMap[data.memberDigitalAdoptionRate] || 0.25;
  const monthlyWithdrawals = Math.round(memberCount * adoption * 2);
  const withdrawalRevenue = Math.round(monthlyWithdrawals * 15 * 12);

  return {
    subscription: subAnnual,
    loans: loanRevenue,
    withdrawals: withdrawalRevenue,
    total: subAnnual + loanRevenue + withdrawalRevenue,
  };
}

// ─── Dashboard access whitelist ───────────────────────────────────────────────
// PIN-based auth for presales dashboard. Stored in env or hardcoded default.
const DASHBOARD_PIN = process.env.DASHBOARD_PIN || "SAFQuest12&3!";

export async function registerRoutes(httpServer: Server, app: Express) {
  // Verify dashboard PIN
  app.post("/api/dashboard/verify", (req: Request, res: Response) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ message: "PIN required" });
    if (pin === DASHBOARD_PIN) {
      return res.json({ success: true, token: Buffer.from(`safaricom:${Date.now()}`).toString("base64") });
    }
    return res.status(401).json({ message: "Invalid PIN" });
  });

  // Create a new assessment
  app.post("/api/assessments/create", async (req: Request, res: Response) => {
    let code = generateAccessCode();
    let attempts = 0;
    while (await storage.getAssessmentByCode(code) && attempts < 10) {
      code = generateAccessCode();
      attempts++;
    }
    const assessment = await storage.createAssessment(code);
    res.json(assessment);
  });

  // Get assessment by access code
  app.get("/api/assessments/code/:code", async (req: Request, res: Response) => {
    const assessment = await storage.getAssessmentByCode(String(req.params.code));
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    res.json(assessment);
  });

  // Get assessment by ID
  app.get("/api/assessments/:id", async (req: Request, res: Response) => {
    const assessment = await storage.getAssessmentById(Number(req.params.id));
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    res.json(assessment);
  });

  // Get all assessments (presales dashboard — PIN protected via client)
  app.get("/api/assessments", async (req: Request, res: Response) => {
    const all = await storage.getAllAssessments();
    res.json(all);
  });

  // Update assessment
  app.patch("/api/assessments/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await storage.getAssessmentById(id);
    if (!existing) return res.status(404).json({ message: "Assessment not found" });

    const data = req.body;

    // Auto-compute scores
    if (data.itStaffCount !== undefined || data.hasMobileApp !== undefined || data.memberDigitalAdoptionRate !== undefined) {
      const merged = { ...existing, ...data };
      data.techProficiencyScore = computeTechScore(merged);
    }
    if (data.accountingSystem !== undefined || data.reconciliationFrequency !== undefined) {
      const merged = { ...existing, ...data };
      data.accountingProficiencyScore = computeAccountingScore(merged);
    }

    // Auto-recommend model on submission
    if (data.status === "submitted") {
      const merged = { ...existing, ...data };
      const mergedWithScores = {
        ...merged,
        techProficiencyScore: data.techProficiencyScore || existing.techProficiencyScore || computeTechScore(merged),
        accountingProficiencyScore: data.accountingProficiencyScore || existing.accountingProficiencyScore || computeAccountingScore(merged),
      };
      const { model, reasoning, complexity } = recommendModel(mergedWithScores);
      data.recommendedModel = data.recommendedModel || model;
      data.complexityRating = data.complexityRating || complexity;
      const rev = estimateRevenue(merged, model);
      data.estimatedRevenue = data.estimatedRevenue || rev.total;
      data.estimatedRevenueBreakdown = JSON.stringify({ subscription: rev.subscription, loans: rev.loans, withdrawals: rev.withdrawals });
      if (!data.presalesNotes) {
        data.presalesNotes = reasoning;
      }
      data.submittedAt = new Date().toISOString();
    }

    const updated = await storage.updateAssessment(id, data);
    res.json(updated);
  });

  // Delete assessment
  app.delete("/api/assessments/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const existing = await storage.getAssessmentById(id);
    if (!existing) return res.status(404).json({ message: "Assessment not found" });
    await storage.deleteAssessment(id);
    res.json({ success: true });
  });

  // Generate DOCX solution design brief
  app.get("/api/assessments/:id/docx", async (req: Request, res: Response) => {
    const assessment = await storage.getAssessmentById(Number(req.params.id));
    if (!assessment) return res.status(404).json({ message: "Not found" });

    function modelLabel(m: string | null) {
      if (m === "full_stack") return "Full Stack (A+B) — KES 20,000/mo";
      if (m === "front_end_only") return "Front-End Channels Only (A+C) — KES 10,000/mo";
      if (m === "back_end_only") return "Back-End Platform Only (B) — KES 15,000/mo";
      return "Pending Assessment";
    }

    function safeList(json: string | null): string[] {
      try { return JSON.parse(json || "[]") || []; } catch { return []; }
    }

    function para(text: string, opts: { bold?: boolean; size?: number; color?: string; spacing?: number } = {}) {
      return new Paragraph({
        spacing: { after: opts.spacing ?? 80 },
        children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20, color: opts.color ?? "000000" })],
      });
    }

    function heading(text: string, level = HeadingLevel.HEADING_2) {
      return new Paragraph({
        heading: level,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text, bold: true, size: 24, color: "007A40" })],
      });
    }

    function kv(key: string, value: string) {
      return new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `${key}: `, bold: true, size: 20 }),
          new TextRun({ text: value || "—", size: 20 }),
        ],
      });
    }

    function bullet(text: string) {
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 40 },
        children: [new TextRun({ text, size: 20 })],
      });
    }

    function divider() {
      return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" } },
        spacing: { after: 200 },
      });
    }

    const a = assessment;
    const painPoints = safeList(a.painPoints);
    const outcomes = safeList(a.desiredOutcomes);
    const complaints = safeList(a.memberComplaintTypes);
    const specialLoans = safeList(a.specialLoanProducts);
    const channelFeatures = safeList(a.digitalChannelFeatures);

    const hasCbs = a.currentCoreSystem && a.currentCoreSystem !== "none";
    const hasDigital = a.hasMobileApp === "yes" || a.hasUssd === "yes";

    const doc = new Document({
      title: `MySACCO Solution Design Brief — ${a.saccoName || a.accessCode}`,
      creator: "Safaricom MySACCO Presales",
      sections: [{
        properties: { page: { margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.2), right: convertInchesToTwip(1.2) } } },
        children: [
          // Cover
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "MySACCO Pre-Sales Solution Design Brief", bold: true, size: 32, color: "007A40" })] }),
          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: a.saccoName || "SACCO Assessment", bold: true, size: 28, color: "111827" })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `Access Code: ${a.accessCode}`, size: 18, color: "6B7280" })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}`, size: 18, color: "6B7280" })] }),
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Confidential — Safaricom Presales Internal Use Only", size: 16, color: "EF4444" })] }),
          divider(),

          // 1. SACCO Profile
          heading("1. SACCO Profile"),
          kv("SACCO Name", a.saccoName || "—"),
          kv("SACCO Type", a.saccoType || "—"),
          kv("SASRA Licensed", a.sasraLicensed || "—"),
          kv("County", a.county || "—"),
          kv("Industry / Membership", a.industry === "other" ? (a.industryOther || "Other") : (a.industry || "—")),
          kv("Contact Person", [a.contactPersonName, a.contactPersonTitle].filter(Boolean).join(" — ") || "—"),
          kv("Email", a.contactEmail || "—"),
          kv("Phone", a.contactPhone || "—"),
          divider(),

          // 2. Scale & Structure
          heading("2. Membership & Scale"),
          kv("Total Members", a.totalMembers || "—"),
          kv("Annual Growth Rate", a.memberGrowthRate || "—"),
          kv("Avg Monthly Loans", a.avgMonthlyLoans || "—"),
          kv("Monthly Txn Volume", a.monthlyTransactionVolume || "—"),
          kv("Services", [a.hasFosa === "yes" ? "FOSA" : null, a.hasBosa === "yes" ? "BOSA" : null].filter(Boolean).join(", ") || "—"),
          divider(),

          // 3. Technology
          heading("3. Technology Proficiency"),
          kv("Core Banking System", a.currentCoreSystem === "other" ? (a.currentCoreSystemOther || "Other") : (a.currentCoreSystem || "—")),
          kv("CBS Age", a.coreSystemAge || "—"),
          kv("Vendor Relationship", a.hasVendorRelationship === "yes" ? (a.vendorName || "Yes") : (a.hasVendorRelationship || "—")),
          kv("Deployment Lead", a.vendorCanAssist === "vendor" ? "Existing Vendor" : a.vendorCanAssist === "sacco_self" ? "SACCO Internal IT" : a.vendorCanAssist === "safaricom" ? "Safaricom (Professional Services)" : "—"),
          kv("Test/Sandbox Environment", a.hasSandbox || "—"),
          kv("Mobile App", a.hasMobileApp || "—"),
          kv("USSD", a.hasUssd || "—"),
          kv("Web Portal", a.hasWebPortal || "—"),
          ...(hasDigital ? [
            kv("Digital Channels Age", a.digitalChannelsAge || "—"),
            kv("Digital Features", channelFeatures.join(", ") || "—"),
            kv("Expected Daily Traffic", a.expectedDigitalTraffic || "—"),
            kv("Digital Onboarding", a.onboardsViaDigital || "—"),
            kv("Digital Adoption Rate", a.memberDigitalAdoptionRate || "—"),
          ] : []),
          kv("M-PESA Paybill", a.existingPaybill === "yes" ? `Yes (${a.paybillNumber || "#TBC"})` : (a.existingPaybill || "—")),
          kv("M-PESA One-Account", a.paybillOneAccount || "—"),
          kv("IT Staff", a.itStaffCount || "—"),
          kv("Tech Proficiency Score", a.techProficiencyScore != null ? `${a.techProficiencyScore}/10` : "—"),
          divider(),

          // 4. Accounting
          heading("4. Financial Accounting Proficiency"),
          kv("Accounting System", a.accountingSystem || "—"),
          kv("Chart of Accounts", a.chartOfAccountsSetup || "—"),
          kv("Reconciliation Frequency", a.reconciliationFrequency || "—"),
          kv("SASRA Reporting", a.sasraReportingCapability || "—"),
          kv("Finance Staff", a.financialStaffCount || "—"),
          kv("Accounting Score", a.accountingProficiencyScore != null ? `${a.accountingProficiencyScore}/10` : "—"),
          divider(),

          // 5. Pain Points
          heading("5. Pain Points & Goals"),
          para("Pain Points:", { bold: true }),
          ...painPoints.map(bullet),
          ...(a.painPointsOther ? [para(`Other: ${a.painPointsOther}`, { size: 18 })] : []),
          para(""),
          para("Top Priority:", { bold: true }),
          para(a.topPriority || "—", { size: 18 }),
          para(""),
          para("Member Complaints:", { bold: true }),
          ...complaints.map(bullet),
          ...(a.memberComplaintsOther ? [para(`Other: ${a.memberComplaintsOther}`, { size: 18 })] : []),
          para(""),
          para("Desired Outcomes:", { bold: true }),
          ...outcomes.map(bullet),
          ...(a.desiredOutcomesOther ? [para(`Other: ${a.desiredOutcomesOther}`, { size: 18 })] : []),
          kv("Solution Urgency", a.solutionUrgency || "—"),
          kv("Preferred Rollout Timeline", a.preferredRolloutTimeline || "—"),
          divider(),

          // 6. Requirements
          heading("6. Requirements"),
          ...(hasCbs ? [
            kv("Data Migration Required", a.requiresDataMigration || "—"),
            kv("Migration Complexity", a.dataMigrationComplexity || "—"),
            kv("Custom API Integration", a.requiresCustomIntegration || "—"),
            kv("Integration Details", a.integrationDetails || "—"),
            kv("API Documentation Available", a.hasApiDocumentation || "—"),
          ] : []),
          kv("Custom Branding", a.requiresCustomBranding || "—"),
          kv("Special Loan Products", specialLoans.join(", ") || "None"),
          kv("Additional Context", a.additionalContext || "—"),
          divider(),

          // 7. Recommendation
          heading("7. Recommended MySACCO Solution"),
          new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: modelLabel(a.recommendedModel), bold: true, size: 28, color: "007A40" })] }),
          kv("Complexity Rating", (a.complexityRating || "—").replace("_", " ")),
          kv("Estimated Annual Revenue", a.estimatedRevenue ? `KES ${a.estimatedRevenue.toLocaleString()}/year` : "—"),
          para(""),
          para("Presales Reasoning:", { bold: true }),
          para(a.presalesNotes || "Pending review.", { size: 18 }),
          para(""),
          para("Next Steps:", { bold: true }),
          para(a.nextSteps || "Pending review.", { size: 18 }),
          kv("PWIN Score", a.pwinScore != null ? `${a.pwinScore}%` : "—"),
          kv("Reviewed By", a.reviewedBy || "—"),
          kv("Reviewed At", a.reviewedAt ? new Date(a.reviewedAt).toLocaleDateString("en-KE") : "—"),
          divider(),

          para("© Safaricom PLC — MySACCO Presales · Confidential", { size: 16, color: "6B7280" }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `MySACCO-Brief-${(a.saccoName || a.accessCode).replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  // Get recommendation
  app.get("/api/assessments/:id/recommendation", async (req: Request, res: Response) => {
    const assessment = await storage.getAssessmentById(Number(req.params.id));
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    const { model, reasoning, complexity } = recommendModel(assessment);
    const rev = estimateRevenue(assessment, model);
    res.json({ model, reasoning, complexity, estimatedRevenue: rev.total, revenueBreakdown: rev });
  });

  return httpServer;
}
