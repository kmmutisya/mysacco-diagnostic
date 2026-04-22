import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle, Copy, AlertCircle, Save, Upload, X, FileIcon, Plus, Minus } from "lucide-react";
import type { Assessment } from "@shared/schema";

// ─── Kenyan Counties ─────────────────────────────────────────────────────────
const COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa",
  "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
  "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
  "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Muranga","Nairobi",
  "Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya",
  "Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana",
  "Uasin Gishu","Vihiga","Wajir","West Pokot",
];

const INDUSTRIES = [
  { value: "teachers", label: "Teachers / Education" },
  { value: "healthcare", label: "Healthcare / Medical" },
  { value: "transport", label: "Transport / Logistics" },
  { value: "government", label: "Government / Civil Service" },
  { value: "police_military", label: "Police / Military / Security" },
  { value: "agriculture", label: "Agriculture / Farming" },
  { value: "manufacturing", label: "Manufacturing / Industry" },
  { value: "trade_retail", label: "Trade / Retail / SME" },
  { value: "financial_services", label: "Financial Services / Banking" },
  { value: "church_welfare", label: "Church / Welfare / Community" },
  { value: "mixed", label: "Mixed / Multi-sector" },
  { value: "other", label: "Other (specify below)" },
];

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "SACCO Profile",       desc: "Basic identity and contact information" },
  { id: 2, title: "Membership & Scale",  desc: "Your membership size, growth and financials" },
  { id: 3, title: "Technology",          desc: "Current systems and digital channels" },
  { id: 4, title: "Financial Accounting",desc: "Accounting systems and reporting capabilities" },
  { id: 5, title: "Pain Points & Goals", desc: "Challenges you face and outcomes you seek" },
  { id: 6, title: "Requirements",        desc: "Deployment needs and specific requirements" },
];

// ─── Component helpers ────────────────────────────────────────────────────────

function FieldGroup({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      {children}
    </div>
  );
}

function RadioCard({ name, value, selected, onChange, label, desc, compact }: {
  name: string; value: string; selected: boolean; onChange: (v: string) => void;
  label: string; desc?: string; compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        data-testid={`option-${name}-${value}`}
        onClick={() => onChange(value)}
        className={`cursor-pointer rounded-lg border px-3 py-2.5 transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${selected ? "border-primary bg-primary" : "border-border"}`} />
          <span className="text-sm font-medium leading-tight">{label}</span>
        </div>
      </div>
    );
  }
  return (
    <div
      data-testid={`option-${name}-${value}`}
      onClick={() => onChange(value)}
      className={`cursor-pointer rounded-lg border px-4 py-3 transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${selected ? "border-primary bg-primary" : "border-border"}`} />
        <div>
          <div className="text-sm font-medium leading-tight">{label}</div>
          {desc && <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</div>}
        </div>
      </div>
    </div>
  );
}

function RadioGroup({ name, value, onChange, options, cols }: {
  name: string; value: string | null; onChange: (v: string) => void;
  options: { value: string; label: string; desc?: string }[];
  cols?: number;
}) {
  const compact = !options.some((o) => o.desc) && (!!cols || options.length >= 4);
  const gridClass = cols === 2 ? "grid grid-cols-2 gap-2" : cols === 3 ? "grid grid-cols-3 gap-2" : "grid gap-2";
  return (
    <div className={gridClass}>
      {options.map((o) => (
        <RadioCard key={o.value} name={name} value={o.value} selected={value === o.value} onChange={onChange} label={o.label} desc={o.desc} compact={compact} />
      ))}
    </div>
  );
}

function MultiSelect({ name, value, onChange, options, allowOther, otherValue, onOtherChange, cols }: {
  name: string; value: string[]; onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  allowOther?: boolean; otherValue?: string; onOtherChange?: (v: string) => void;
  cols?: number;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const showOtherInput = allowOther && value.includes("other");
  const allItems = [...options, ...(allowOther ? [{ value: "other", label: "Other (specify below)" }] : [])];
  const gridClass = cols === 2 ? "grid grid-cols-2 gap-2" : cols === 3 ? "grid grid-cols-3 gap-2" : "grid gap-2";
  const compact = cols !== undefined || options.length >= 5;

  return (
    <div className="space-y-2">
      <div className={gridClass}>
        {allItems.map((o) => {
          const selected = value.includes(o.value);
          return (
            <div
              key={o.value}
              data-testid={`option-${name}-${o.value}`}
              onClick={() => toggle(o.value)}
              className={`cursor-pointer rounded-lg border ${compact ? "px-3 py-2.5" : "px-4 py-3"} transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${selected ? "border-primary bg-primary" : "border-border"}`}>
                  {selected && <div className={`${compact ? "w-1.5 h-1.5" : "w-2 h-2"} bg-white rounded-sm`} />}
                </div>
                <span className="text-sm font-medium leading-tight">{o.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      {showOtherInput && onOtherChange && (
        <Textarea
          className="mt-2"
          rows={3}
          placeholder="Please describe other items…"
          value={otherValue || ""}
          onChange={(e) => onOtherChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ─── File Upload ──────────────────────────────────────────────────────────────

interface UploadedFile { name: string; size: number; type: string; data: string }

function FileUpload({ value, onChange }: { value: UploadedFile[]; onChange: (files: UploadedFile[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  async function processFiles(fileList: FileList) {
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit.`, variant: "destructive" });
        continue;
      }
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newFiles.push({ name: file.name, size: file.size, type: file.type, data });
    }
    onChange([...value, ...newFiles]);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
        onClick={() => document.getElementById("file-upload-input")?.click()}
      >
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, images — up to 10MB each</p>
        <input id="file-upload-input" type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => e.target.files && processFiles(e.target.files)} />
      </div>
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground truncate">{f.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step content components ──────────────────────────────────────────────────

function Step1({ data, update }: { data: Partial<Assessment>; update: (d: Partial<Assessment>) => void }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="SACCO Name" required>
        <Input placeholder="e.g. Mwalimu National SACCO" value={data.saccoName || ""} onChange={(e) => update({ saccoName: e.target.value })} data-testid="input-sacco-name" />
      </FieldGroup>

      <FieldGroup label="SACCO Type" required>
        <RadioGroup
          name="saccoType"
          value={data.saccoType || null}
          onChange={(v) => update({ saccoType: v })}
          options={[
            { value: "DT-SACCO", label: "DT-SACCO (Deposit-Taking)", desc: "SASRA-regulated, operates FOSA and BOSA services" },
            { value: "Non-DT-SACCO", label: "Non-DT-SACCO (BOSA Only)", desc: "Workplace or community SACCO, savings and loans only" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="SASRA Licensed?" required>
        <RadioGroup
          name="sasraLicensed"
          value={data.sasraLicensed || null}
          onChange={(v) => update({ sasraLicensed: v })}
          options={[
            { value: "yes", label: "Yes — currently licensed" },
            { value: "pending", label: "Pending — application in progress" },
            { value: "no", label: "No — not currently licensed" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="County / Region" required hint="Select the county where your SACCO is primarily based">
        <Select value={data.county || ""} onValueChange={(v) => update({ county: v })}>
          <SelectTrigger data-testid="select-county"><SelectValue placeholder="Select county…" /></SelectTrigger>
          <SelectContent className="max-h-64">
            {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldGroup>

      <FieldGroup label="Primary Industry / Membership Base" required>
        <Select value={data.industry || ""} onValueChange={(v) => update({ industry: v })}>
          <SelectTrigger data-testid="select-industry"><SelectValue placeholder="Select industry…" /></SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {data.industry === "other" && (
          <Input
            className="mt-2"
            placeholder="Describe your industry / membership base"
            value={data.industryOther || ""}
            onChange={(e) => update({ industryOther: e.target.value })}
            data-testid="input-industry-other"
          />
        )}
      </FieldGroup>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact Person</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldGroup label="Full Name" required>
            <Input placeholder="e.g. Jane Mwangi" value={data.contactPersonName || ""} onChange={(e) => update({ contactPersonName: e.target.value })} data-testid="input-contact-name" />
          </FieldGroup>
          <FieldGroup label="Title / Role">
            <Input placeholder="e.g. CEO, Finance Manager" value={data.contactPersonTitle || ""} onChange={(e) => update({ contactPersonTitle: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Email Address" required>
            <Input type="email" placeholder="email@sacco.co.ke" value={data.contactEmail || ""} onChange={(e) => update({ contactEmail: e.target.value })} data-testid="input-contact-email" />
          </FieldGroup>
          <FieldGroup label="Phone Number" required>
            <Input placeholder="+254 7XX XXX XXX" value={data.contactPhone || ""} onChange={(e) => update({ contactPhone: e.target.value })} data-testid="input-contact-phone" />
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}

function Step2({ data, update }: { data: Partial<Assessment>; update: (d: Partial<Assessment>) => void }) {
  return (
    <div className="space-y-5">
      <FieldGroup label="Total Active Members" required hint="How many members are currently registered with your SACCO?">
        <RadioGroup
          name="totalMembers"
          value={data.totalMembers || null}
          onChange={(v) => update({ totalMembers: v })}
          cols={2}
          options={[
            { value: "<500", label: "Under 500 members" },
            { value: "500-2000", label: "500 – 2,000 members" },
            { value: "2001-10000", label: "2,001 – 10,000 members" },
            { value: "10000+", label: "Over 10,000 members" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="Annual Membership Growth Rate">
        <RadioGroup
          name="memberGrowthRate"
          value={data.memberGrowthRate || null}
          onChange={(v) => update({ memberGrowthRate: v })}
          cols={2}
          options={[
            { value: "<5%", label: "Less than 5% per year" },
            { value: "5-15%", label: "5% – 15% per year" },
            { value: "15-30%", label: "15% – 30% per year" },
            { value: "30%+", label: "More than 30% per year" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="Average Number of Loans per Month" required hint="Approximate number of loan applications or disbursements processed monthly">
        <RadioGroup
          name="avgMonthlyLoans"
          value={data.avgMonthlyLoans || null}
          onChange={(v) => update({ avgMonthlyLoans: v })}
          cols={2}
          options={[
            { value: "<50", label: "Fewer than 50 loans/month" },
            { value: "50-200", label: "50 – 200 loans/month" },
            { value: "200-500", label: "200 – 500 loans/month" },
            { value: "500+", label: "More than 500 loans/month" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="Monthly Transaction Volume (KES)" hint="Approximate total value of all deposits, withdrawals and loan transactions per month">
        <RadioGroup
          name="monthlyTransactionVolume"
          value={data.monthlyTransactionVolume || null}
          onChange={(v) => update({ monthlyTransactionVolume: v })}
          cols={2}
          options={[
            { value: "<1M", label: "Under KES 1 Million" },
            { value: "1M-10M", label: "KES 1M – 10M" },
            { value: "10M-50M", label: "KES 10M – 50M" },
            { value: "50M+", label: "Over KES 50M" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="Services Offered" hint="Select all that apply">
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { key: "hasFosa", label: "FOSA (Front Office Services)" },
            { key: "hasBosa", label: "BOSA (Back Office Services)" },
          ].map((s) => {
            const isYes = (data as any)[s.key] === "yes";
            return (
              <div
                key={s.key}
                onClick={() => update({ [s.key]: isYes ? "no" : "yes" } as any)}
                className={`cursor-pointer rounded-lg border px-4 py-3 transition-all ${isYes ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isYes ? "border-primary bg-primary" : "border-border"}`}>
                    {isYes && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </FieldGroup>
    </div>
  );
}

function Step3({ data, update }: { data: Partial<Assessment>; update: (d: Partial<Assessment>) => void }) {
  const hasCbs = data.currentCoreSystem && data.currentCoreSystem !== "none" && data.currentCoreSystem !== "spreadsheets";
  const hasAnyDigital = data.hasMobileApp === "yes" || data.hasUssd === "yes" || data.hasWebPortal === "yes";
  const currentFeatures: string[] = (() => { try { return JSON.parse(data.digitalChannelFeatures || "[]"); } catch { return []; } })();
  const hasMemberRegistration = currentFeatures.includes("member_registration");

  const CBS_OPTIONS = [
    { value: "none", label: "None — no core banking system" },
    { value: "spreadsheets", label: "Spreadsheets / Manual records only" },
    { value: "bankers_realm", label: "Bankers Realm (by Craft Silicon)" },
    { value: "coopmis", label: "CoopMIS" },
    { value: "navision", label: "Microsoft Dynamics / Navision" },
    { value: "olympic", label: "Olympic" },
    { value: "orbit_r", label: "Orbit-R (by Neptune Software)" },
    { value: "vanguard", label: "Vanguard (by Centrino)" },
    { value: "jisort", label: "Jisort" },
    { value: "other", label: "Other (specify below)" },
  ];

  const DIGITAL_FEATURES = [
    { value: "account_balance", label: "Account Balance Views" },
    { value: "downloadable_statements", label: "Downloadable Statements" },
    { value: "loan_application", label: "Loan Application" },
    { value: "loan_repayment", label: "Loan Repayment" },
    { value: "loan_calculator", label: "Loan Calculator" },
    { value: "savings_deposit", label: "Savings Deposit" },
    { value: "bank_withdrawal", label: "Bank Withdrawals" },
    { value: "fund_transfers", label: "Fund Transfers" },
    { value: "member_registration", label: "Member Registration / Onboarding" },
    { value: "guarantor", label: "Guarantor Approval" },
    { value: "notifications", label: "SMS / Push Notifications" },
    { value: "support_channels", label: "Support Channels (Chat / Tickets)" },
  ];

  return (
    <div className="space-y-5">
      {/* Core Banking System */}
      <FieldGroup label="Core Banking System" required hint="Select the primary platform used to manage member accounts, loans and savings">
        <RadioGroup
          name="currentCoreSystem"
          value={data.currentCoreSystem || null}
          onChange={(v) => update({ currentCoreSystem: v })}
          cols={2}
          options={CBS_OPTIONS}
        />
        {data.currentCoreSystem === "other" && (
          <Input
            className="mt-2"
            placeholder="Name of your core banking system"
            value={data.currentCoreSystemOther || ""}
            onChange={(e) => update({ currentCoreSystemOther: e.target.value })}
          />
        )}
      </FieldGroup>

      {/* CBS Age — conditional on having a CBS */}
      {hasCbs && (
        <FieldGroup label="How long have you been using this system?">
          <RadioGroup
            name="coreSystemAge"
            value={data.coreSystemAge || null}
            onChange={(v) => update({ coreSystemAge: v })}
            cols={2}
            options={[
              { value: "<1yr", label: "Less than 1 year" },
              { value: "1-3yrs", label: "1 – 3 years" },
              { value: "3-7yrs", label: "3 – 7 years" },
              { value: "7yrs+", label: "More than 7 years" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Vendor relationship — conditional on having a CBS */}
      {hasCbs && (
        <FieldGroup label="Are you working with a vendor for your core banking platform?" hint="Do you have an active support or maintenance contract with a technology vendor?">
          <RadioGroup
            name="hasVendorRelationship"
            value={data.hasVendorRelationship || null}
            onChange={(v) => update({ hasVendorRelationship: v })}
            options={[
              { value: "yes", label: "Yes — we have an active vendor relationship" },
              { value: "no", label: "No — we self-manage or the vendor is no longer engaged" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Vendor name */}
      {hasCbs && data.hasVendorRelationship === "yes" && (
        <FieldGroup label="Vendor Name">
          <Input
            placeholder="e.g. Craft Silicon, Neptune Software…"
            value={data.vendorName || ""}
            onChange={(e) => update({ vendorName: e.target.value })}
          />
        </FieldGroup>
      )}

      {/* Vendor deployment responsibility */}
      {hasCbs && data.hasVendorRelationship === "yes" && (
        <FieldGroup label="For MySACCO deployment/integration, who should lead the technical work?" hint="Note: Safaricom-led integration attracts consulting/professional services fees to be established after assessment">
          <RadioGroup
            name="vendorCanAssist"
            value={data.vendorCanAssist || null}
            onChange={(v) => update({ vendorCanAssist: v })}
            options={[
              { value: "vendor", label: "Our existing vendor will assist" },
              { value: "sacco_self", label: "Our internal IT team can handle it" },
              { value: "safaricom", label: "We'd like Safaricom to do it (professional services apply)" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Sandbox */}
      {hasCbs && (
        <FieldGroup label="Do you have a test/sandbox environment for your core banking system?">
          <RadioGroup
            name="hasSandbox"
            value={data.hasSandbox || null}
            onChange={(v) => update({ hasSandbox: v })}
            options={[
              { value: "yes", label: "Yes — we have a dedicated test environment" },
              { value: "no", label: "No — we only have a production environment" },
              { value: "unsure", label: "Not sure" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Digital Channels */}
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Digital Member Channels</p>

        <div className="grid sm:grid-cols-3 gap-2">
          {[
            { key: "hasMobileApp", label: "Mobile App (Android/iOS)" },
            { key: "hasUssd", label: "USSD (*XXX#)" },
            { key: "hasWebPortal", label: "Web Portal / Member Portal" },
          ].map((ch) => {
            const isYes = (data as any)[ch.key] === "yes";
            return (
              <div
                key={ch.key}
                onClick={() => update({ [ch.key]: isYes ? "no" : "yes" } as any)}
                className={`cursor-pointer rounded-lg border px-4 py-3 transition-all ${isYes ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isYes ? "border-primary bg-primary" : "border-border"}`}>
                    {isYes && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <span className="text-sm font-medium">{ch.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Digital channel age — conditional */}
      {hasAnyDigital && (
        <FieldGroup label="How long have you had these digital channels?">
          <RadioGroup
            name="digitalChannelsAge"
            value={data.digitalChannelsAge || null}
            onChange={(v) => update({ digitalChannelsAge: v })}
            options={[
              { value: "<1yr", label: "Less than 1 year" },
              { value: "1-3yrs", label: "1 – 3 years" },
              { value: "3yrs+", label: "More than 3 years" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Features on digital channels — conditional */}
      {hasAnyDigital && (
        <FieldGroup label="Which features are currently available on your digital channels?" hint="Select all that apply">
          <MultiSelect
            name="digitalChannelFeatures"
            value={JSON.parse(data.digitalChannelFeatures || "[]")}
            onChange={(v) => update({ digitalChannelFeatures: JSON.stringify(v) })}
            cols={2}
            options={DIGITAL_FEATURES}
          />
        </FieldGroup>
      )}

      {/* Expected traffic — conditional */}
      {hasAnyDigital && (
        <FieldGroup label="Expected peak daily sessions on your digital channels" hint="Approximate number of member login/transaction sessions per day at peak">
          <RadioGroup
            name="expectedDigitalTraffic"
            value={data.expectedDigitalTraffic || null}
            onChange={(v) => update({ expectedDigitalTraffic: v })}
            cols={2}
            options={[
              { value: "<100", label: "Fewer than 100 sessions/day" },
              { value: "100-500", label: "100 – 500 sessions/day" },
              { value: "500-2000", label: "500 – 2,000 sessions/day" },
              { value: "2000+", label: "Over 2,000 sessions/day" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Onboard via digital — conditional: only if member_registration is in features */}
      {hasAnyDigital && hasMemberRegistration && (
        <FieldGroup label="Do you currently register / onboard new members through your digital channels?">
          <RadioGroup
            name="onboardsViaDigital"
            value={data.onboardsViaDigital || null}
            onChange={(v) => update({ onboardsViaDigital: v })}
            options={[
              { value: "yes", label: "Yes — fully digital onboarding" },
              { value: "partial", label: "Partially — some steps are digital" },
              { value: "no", label: "No — all onboarding is manual / in-person" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Paybill */}
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">M-PESA Integration</p>
        <FieldGroup label="Do you have an existing M-PESA Paybill?" required>
          <RadioGroup
            name="existingPaybill"
            value={data.existingPaybill || null}
            onChange={(v) => update({ existingPaybill: v })}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </FieldGroup>
      </div>

      {/* Paybill number */}
      {data.existingPaybill === "yes" && (
        <FieldGroup label="Paybill Number">
          <Input
            placeholder="e.g. 400200"
            value={data.paybillNumber || ""}
            onChange={(e) => update({ paybillNumber: e.target.value })}
          />
        </FieldGroup>
      )}

      {/* Paybill One-Account */}
      {data.existingPaybill === "yes" && (
        <FieldGroup label="Does your Paybill accept both deposits and withdrawals (M-PESA One-Account)?" hint="One-Account allows members to both deposit and withdraw via the same Paybill">
          <RadioGroup
            name="paybillOneAccount"
            value={data.paybillOneAccount || null}
            onChange={(v) => update({ paybillOneAccount: v })}
            options={[
              { value: "yes", label: "Yes — configured for both deposits and withdrawals" },
              { value: "no", label: "No — deposits only (or withdrawals only)" },
              { value: "unsure", label: "I'm not sure" },
            ]}
          />
        </FieldGroup>
      )}

      {/* IT Staff */}
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">IT Capacity</p>
        <FieldGroup label="How many dedicated IT staff does your SACCO have?">
          <RadioGroup
            name="itStaffCount"
            value={data.itStaffCount || null}
            onChange={(v) => update({ itStaffCount: v })}
            cols={2}
            options={[
              { value: "0", label: "None — no dedicated IT staff" },
              { value: "1", label: "1 person" },
              { value: "2-5", label: "2 – 5 people" },
              { value: "5+", label: "More than 5 people" },
            ]}
          />
        </FieldGroup>
      </div>

      {/* Digital adoption */}
      {hasAnyDigital && (
        <FieldGroup label="What percentage of your members actively use your digital channels?" hint="Estimate of members who have logged in or transacted digitally in the last 3 months">
          <RadioGroup
            name="memberDigitalAdoptionRate"
            value={data.memberDigitalAdoptionRate || null}
            onChange={(v) => update({ memberDigitalAdoptionRate: v })}
            cols={2}
            options={[
              { value: "<20%", label: "Less than 20%" },
              { value: "20-50%", label: "20% – 50%" },
              { value: "50-80%", label: "50% – 80%" },
              { value: "80%+", label: "More than 80%" },
            ]}
          />
        </FieldGroup>
      )}
    </div>
  );
}

function Step4({ data, update }: { data: Partial<Assessment>; update: (d: Partial<Assessment>) => void }) {
  const isSasraRegulated = data.sasraLicensed === "yes" || data.sasraLicensed === "pending";
  return (
    <div className="space-y-5">
      <FieldGroup label="Accounting System" required hint="What system do you primarily use for financial accounting and bookkeeping?">
        <RadioGroup
          name="accountingSystem"
          value={data.accountingSystem || null}
          onChange={(v) => update({ accountingSystem: v })}
          options={[
            { value: "manual", label: "Manual (ledgers / cashbooks)" },
            { value: "spreadsheet", label: "Spreadsheets (Excel / Google Sheets)" },
            { value: "standalone", label: "Standalone accounting software (e.g. QuickBooks, Sage)" },
            { value: "integrated", label: "Integrated within our core banking system" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="Chart of Accounts Setup" hint="A Chart of Accounts is a structured list of all financial accounts (assets, liabilities, income, expenses) your SACCO uses to record transactions. A properly set-up CoA is the foundation of automated financial reporting.">
        <RadioGroup
          name="chartOfAccountsSetup"
          value={data.chartOfAccountsSetup || null}
          onChange={(v) => update({ chartOfAccountsSetup: v })}
          options={[
            { value: "yes", label: "Yes — fully configured and in use" },
            { value: "partial", label: "Partially — some accounts are set up" },
            { value: "no", label: "No — not yet configured" },
          ]}
        />
      </FieldGroup>

      <FieldGroup label="How frequently do you perform bank reconciliation?" hint="Bank reconciliation is the process of matching your SACCO's internal accounting records against your bank statements to ensure they agree. Regular reconciliation prevents errors, detects fraud and keeps financial records accurate.">
        <RadioGroup
          name="reconciliationFrequency"
          value={data.reconciliationFrequency || null}
          onChange={(v) => update({ reconciliationFrequency: v })}
          cols={2}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "rarely", label: "Rarely / only when needed" },
          ]}
        />
      </FieldGroup>

      {isSasraRegulated && (<FieldGroup label="SASRA Regulatory Reporting" hint="Can your SACCO generate the required SASRA prudential and statistical returns?">
        <RadioGroup
          name="sasraReportingCapability"
          value={data.sasraReportingCapability || null}
          onChange={(v) => update({ sasraReportingCapability: v })}
          options={[
            { value: "automated", label: "Automated — reports generated directly from system" },
            { value: "manual", label: "Manual — we compile reports manually" },
            { value: "struggling", label: "Struggling — reporting is a challenge" },
          ]}
        />
      </FieldGroup>)}

      <FieldGroup label="Number of Finance / Accounting Staff">
        <RadioGroup
          name="financialStaffCount"
          value={data.financialStaffCount || null}
          onChange={(v) => update({ financialStaffCount: v })}
          cols={2}
          options={[
            { value: "1", label: "1 person" },
            { value: "2-5", label: "2 – 5 people" },
            { value: "5+", label: "More than 5 people" },
          ]}
        />
      </FieldGroup>

    </div>
  );
}

// ─── Top Priority Picker (select up to 3 from refined list + free-text) ───────────

const TOP_PRIORITY_OPTIONS = [
  { value: "digital_member_access",   label: "Give members digital self-service access (app / USSD)" },
  { value: "replace_cbs",             label: "Replace or upgrade our core banking system" },
  { value: "automate_loans",          label: "Speed up and automate loan processing" },
  { value: "mpesa_integration",       label: "Integrate M-PESA for deposits and withdrawals" },
  { value: "sasra_compliance",        label: "Achieve or improve SASRA regulatory compliance" },
  { value: "eliminate_manual",        label: "Eliminate manual and paper-based processes" },
  { value: "financial_reporting",     label: "Get real-time financial reports and dashboards" },
  { value: "member_growth",           label: "Grow and retain our membership base" },
  { value: "reduce_costs",            label: "Reduce operational costs" },
  { value: "data_integrity",          label: "Fix data errors and improve record accuracy" },
  { value: "cybersecurity",           label: "Strengthen security and reduce fraud risk" },
  { value: "new_products",            label: "Launch new financial products for members" },
  { value: "vendor_exit",             label: "Reduce dependency on our current vendor" },
  { value: "staff_efficiency",        label: "Improve staff efficiency and reduce workload" },
];

function TopPriorityPicker({ value, onChange, customValue, onCustomChange }: {
  value: string[];        // up to 3 selected values (ordered = ranked)
  onChange: (v: string[]) => void;
  customValue: string;
  onCustomChange: (v: string) => void;
}) {
  const MAX = 3;

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else if (value.length < MAX) {
      onChange([...value, v]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
        Select up to <strong>3</strong> — in the order that matters most to you (first selected = highest priority).
        {value.length > 0 && (
          <span className="ml-1 font-medium text-primary">{value.length}/{MAX} selected.</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {TOP_PRIORITY_OPTIONS.map((opt, idx) => {
          const selectedIdx = value.indexOf(opt.value);
          const isSelected = selectedIdx !== -1;
          const isDisabled = !isSelected && value.length >= MAX;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isDisabled}
              onClick={() => toggle(opt.value)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : isDisabled
                  ? "border-border opacity-40 cursor-not-allowed"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold border-2 transition-colors ${
                isSelected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/30 text-muted-foreground"
              }`}>
                {isSelected ? selectedIdx + 1 : ""}
              </span>
              <span className={isSelected ? "text-foreground font-medium" : "text-muted-foreground"}>{opt.label}</span>
            </button>
          );
        })}
      </div>
      {/* Selected summary */}
      {value.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Your top priorities</p>
          <ol className="space-y-0.5">
            {value.map((v, i) => (
              <li key={v} className="text-xs flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                {TOP_PRIORITY_OPTIONS.find((o) => o.value === v)?.label || v}
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* Free-text fallback */}
      <div className="border-t pt-3">
        <Label className="text-xs font-medium text-muted-foreground">Not on the list? Describe your top priority here:</Label>
        <Textarea
          rows={2}
          className="mt-2"
          placeholder="Optional: describe a specific priority not listed above…"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Likert urgency scale ─────────────────────────────────────────────────────

function UrgencyScale({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const levels = [
    { value: "low",      label: "Low",      sub: "Exploring future options",         color: "bg-green-500" },
    { value: "medium",   label: "Medium",   sub: "Within 6 months",                  color: "bg-lime-500" },
    { value: "high",     label: "High",     sub: "Within 3 months",                  color: "bg-amber-500" },
    { value: "critical", label: "Critical", sub: "Top priority — act now",           color: "bg-red-500" },
  ];
  const activeIdx = levels.findIndex((l) => l.value === value);

  return (
    <div className="space-y-4">
      {/* Bar track */}
      <div className="relative pt-2 pb-1">
        <div className="flex gap-1 h-3">
          {levels.map((l, i) => (
            <button
              key={l.value}
              type="button"
              onClick={() => onChange(l.value)}
              className={`flex-1 rounded-full transition-all ${i <= activeIdx ? l.color : "bg-muted"}`}
            />
          ))}
        </div>
      </div>
      {/* Labels */}
      <div className="grid grid-cols-4 gap-1">
        {levels.map((l, i) => (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            className={`rounded-lg border px-2 py-2.5 text-center transition-all ${
              value === l.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/30 hover:bg-muted/40"
            }`}
          >
            <div className={`text-xs font-bold mb-0.5 ${value === l.value ? "text-primary" : "text-foreground"}`}>{l.label}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{l.sub}</div>
          </button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-center text-muted-foreground">
          {value === "critical" && "🔴 This is your top strategic priority — you need to act now."}
          {value === "high" && "🟠 High urgency — you aim to have a solution in place within 3 months."}
          {value === "medium" && "🟡 Medium urgency — within 6 months is acceptable."}
          {value === "low" && "🟢 Low urgency — you are exploring options for the future."}
        </p>
      )}
    </div>
  );
}

function Step5({ data, update }: { data: Partial<Assessment>; update: (d: Partial<Assessment>) => void }) {
  const painPointOptions = [
    { value: "manual_processes", label: "Too many manual / paper-based processes" },
    { value: "data_errors", label: "Frequent data entry errors and inconsistencies" },
    { value: "poor_reporting", label: "Poor or slow financial reporting" },
    { value: "no_digital_access", label: "Members lack digital access to accounts" },
    { value: "loan_processing", label: "Slow loan processing and approval" },
    { value: "compliance", label: "Difficulty meeting regulatory / SASRA compliance" },
    { value: "security", label: "Security and fraud concerns" },
    { value: "member_growth", label: "Inability to scale with growing membership" },
    { value: "cost", label: "High operational costs" },
    { value: "poor_integration", label: "Poor or no integration between systems" },
    { value: "vendor_dependency", label: "Vendor dependency — over-reliance on a single vendor" },
    { value: "limited_products", label: "Limited financial product offerings" },
  ];

  const complaintOptions = [
    { value: "long_queues", label: "Long queues at the branch" },
    { value: "slow_service", label: "Slow service delivery" },
    { value: "insufficient_ussd_mobile", label: "Insufficient USSD/Mobile App services" },
    { value: "ussd_downtime", label: "USSD downtime or poor reliability" },
    { value: "mobile_app_downtime", label: "Mobile App downtime or bugs" },
    { value: "loan_delays", label: "Delays in loan processing" },
    { value: "statement_access", label: "Difficulty accessing statements / account info" },
    { value: "no_digital", label: "No digital options available" },
    { value: "poor_communication", label: "Poor communication and updates" },
  ];

  const outcomeOptions = [
    { value: "digital_channels", label: "Member self-service digital channels (app & USSD)" },
    { value: "core_banking", label: "Modern, reliable core banking system" },
    { value: "loan_automation", label: "Automated loan processing and approval" },
    { value: "reporting", label: "Real-time financial reporting and dashboards" },
    { value: "compliance_tools", label: "SASRA compliance and regulatory tools" },
    { value: "mpesa_integration", label: "M-PESA integration for payments" },
    { value: "analytics", label: "Analytics and business intelligence" },
    { value: "credit_scoring", label: "Credit scoring capabilities" },
    { value: "cybersecurity", label: "Cybersecurity controls and audit trails" },
    { value: "product_catalog", label: "Product catalog creation and management" },
    { value: "cost_reduction", label: "Reduced operational costs" },
    { value: "member_growth_tools", label: "Tools to attract and onboard more members" },
  ];

  const currentPains: string[] = (() => { try { return JSON.parse(data.painPoints || "[]"); } catch { return []; } })();
  const allPainValues = painPointOptions.map((o) => o.value);
  const allSelected = allPainValues.every((v) => currentPains.includes(v));

  // topPriority stored as JSON array for ranked list
  const topPriorityRanked: string[] = (() => {
    try {
      const p = JSON.parse(data.topPriority || "null");
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  })();

  return (
    <div className="space-y-5">
      <FieldGroup label="Current Pain Points" hint="Select all that apply — what are the biggest challenges your SACCO faces?">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{currentPains.length} selected</span>
          <button
            type="button"
            onClick={() => update({ painPoints: allSelected ? "[]" : JSON.stringify(allPainValues) })}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>
        <MultiSelect
          name="painPoints"
          value={currentPains}
          onChange={(v) => update({ painPoints: JSON.stringify(v) })}
          options={painPointOptions}
          cols={2}
          allowOther
          otherValue={data.painPointsOther || ""}
          onOtherChange={(v) => update({ painPointsOther: v })}
        />
      </FieldGroup>

      <FieldGroup label="Top Priority" hint="Select up to 3 priorities in order of importance (1st = most important)">
        <TopPriorityPicker
          value={topPriorityRanked}
          onChange={(v) => update({ topPriority: JSON.stringify(v) })}
          customValue={data.painPointsOther || ""}
          onCustomChange={(v) => update({ painPointsOther: v })}
        />
      </FieldGroup>

      <FieldGroup label="Member Complaints / Service Failures" hint="What do your members most frequently complain about?">
        <MultiSelect
          name="memberComplaintTypes"
          value={JSON.parse(data.memberComplaintTypes || "[]")}
          onChange={(v) => update({ memberComplaintTypes: JSON.stringify(v) })}
          options={complaintOptions}
          cols={2}
          allowOther
          otherValue={data.memberComplaintsOther || ""}
          onOtherChange={(v) => update({ memberComplaintsOther: v })}
        />
      </FieldGroup>

      <FieldGroup label="Desired Outcomes from MySACCO" hint="What outcomes are most important for your SACCO? Select all that apply">
        <MultiSelect
          name="desiredOutcomes"
          value={JSON.parse(data.desiredOutcomes || "[]")}
          onChange={(v) => update({ desiredOutcomes: JSON.stringify(v) })}
          options={outcomeOptions}
          cols={2}
          allowOther
          otherValue={data.desiredOutcomesOther || ""}
          onOtherChange={(v) => update({ desiredOutcomesOther: v })}
        />
      </FieldGroup>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Level of Urgency</p>

        <FieldGroup label="How urgent is finding a solution like MySACCO for your SACCO?" hint="Slide or tap to indicate how urgently you need a solution">
          <UrgencyScale
            value={data.solutionUrgency || ""}
            onChange={(v) => update({ solutionUrgency: v })}
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Preferred rollout timeline" hint="How soon would you like to go live with a new solution?">
        <RadioGroup
          name="preferredRolloutTimeline"
          value={data.preferredRolloutTimeline || null}
          onChange={(v) => update({ preferredRolloutTimeline: v })}
          cols={2}
          options={[
            { value: "immediate", label: "Immediately (as soon as possible)" },
            { value: "1-3months", label: "Within 1 – 3 months" },
            { value: "3-6months", label: "Within 3 – 6 months" },
            { value: "6months+", label: "6 months or more" },
          ]}
        />
      </FieldGroup>
    </div>
  );
}

// ─── Special Loan Products with multi-entry Other ────────────────────────────

function SpecialLoanProductsField({
  value, onChange, otherItems, onOtherChange
}: {
  value: string[];
  onChange: (v: string[]) => void;
  otherItems: string[];
  onOtherChange: (items: string[]) => void;
}) {
  const LOAN_OPTIONS = [
    { value: "emergency", label: "Emergency Loans" },
    { value: "school_fees", label: "School Fees / Education Loans" },
    { value: "asset_financing", label: "Asset Financing / Car Loans" },
    { value: "group_loans", label: "Group / Chama Loans" },
    { value: "salary_advance", label: "Salary Advance Loans" },
    { value: "development", label: "Development Loans" },
    { value: "insurance_backed", label: "Insurance-backed Loans" },
  ];

  const [newOther, setNewOther] = useState("");

  function toggleOption(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  function addOther() {
    const trimmed = newOther.trim();
    if (!trimmed) return;
    onOtherChange([...otherItems, trimmed]);
    setNewOther("");
  }

  function removeOther(idx: number) {
    onOtherChange(otherItems.filter((_, i) => i !== idx));
  }

  return (
    <FieldGroup label="Do you have special or non-standard loan products?" hint="e.g. emergency loans, school fees loans, asset financing, group loans">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {LOAN_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggleOption(opt.value)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
              value.includes(opt.value)
                ? "border-primary bg-primary/5 ring-1 ring-primary text-foreground"
                : "border-border hover:border-primary/30 hover:bg-muted/30 text-muted-foreground"
            }`}
          >
            <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
              value.includes(opt.value) ? "bg-primary border-primary" : "border-muted-foreground/40"
            }`}>
              {value.includes(opt.value) && (
                <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 4l3 3 5-6" />
                </svg>
              )}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
      {/* Custom "Other" entries */}
      {otherItems.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {otherItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <span className="text-sm flex-1">{item}</span>
              <button type="button" onClick={() => removeOther(idx)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-1">
        <Input
          placeholder="Add a custom loan product…"
          value={newOther}
          onChange={(e) => setNewOther(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }}
          className="h-9 text-sm flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addOther} disabled={!newOther.trim()} className="h-9 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </FieldGroup>
  );
}

function Step6({ data, update }: { data: Partial<Assessment>; update: (d: Partial<Assessment>) => void }) {
  const hasCbs = data.currentCoreSystem && data.currentCoreSystem !== "none" && data.currentCoreSystem !== "spreadsheets";
  const uploadedFiles: UploadedFile[] = JSON.parse(data.uploadedDocuments || "[]");

  return (
    <div className="space-y-5">
      {/* Data Migration — only if has CBS */}
      {hasCbs && (
        <FieldGroup label="Will you need to migrate data from your existing core banking system?" hint="e.g. member records, loan history, savings balances, transaction history">
          <RadioGroup
            name="requiresDataMigration"
            value={data.requiresDataMigration || null}
            onChange={(v) => update({ requiresDataMigration: v })}
            options={[
              { value: "yes", label: "Yes — we need to migrate data" },
              { value: "unsure", label: "Unsure — need to assess" },
              { value: "no", label: "No — starting fresh" },
            ]}
          />
        </FieldGroup>
      )}

      {hasCbs && data.requiresDataMigration === "yes" && (
        <FieldGroup label="Data Migration Complexity">
          <RadioGroup
            name="dataMigrationComplexity"
            value={data.dataMigrationComplexity || null}
            onChange={(v) => update({ dataMigrationComplexity: v })}
            options={[
              { value: "simple", label: "Simple — clean, structured data, mostly current records" },
              { value: "moderate", label: "Moderate — some historical data, multiple years" },
              { value: "complex", label: "Complex — large historical dataset, multiple systems, or data quality issues" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Custom API Integration — only if has CBS */}
      {hasCbs && (
        <FieldGroup label="Will you require custom API integration with your existing system?" hint="e.g. integration with your current CBS, payroll system, or third-party tools">
          <RadioGroup
            name="requiresCustomIntegration"
            value={data.requiresCustomIntegration || null}
            onChange={(v) => update({ requiresCustomIntegration: v })}
            options={[
              { value: "yes", label: "Yes — custom integration required" },
              { value: "unsure", label: "Unsure — will need to discuss with our vendor" },
              { value: "no", label: "No — standard deployment is fine" },
            ]}
          />
        </FieldGroup>
      )}

      {hasCbs && data.requiresCustomIntegration === "yes" && (
        <FieldGroup label="Describe the integration needs">
          <Textarea
            rows={3}
            placeholder="What systems need to be integrated and what data should be exchanged?"
            value={data.integrationDetails || ""}
            onChange={(e) => update({ integrationDetails: e.target.value })}
          />
        </FieldGroup>
      )}

      {/* API Documentation — only if has CBS */}
      {hasCbs && (
        <FieldGroup label="Do you have existing API documentation for your core banking system?" hint="Available API specs help streamline integration planning">
          <RadioGroup
            name="hasApiDocumentation"
            value={data.hasApiDocumentation || null}
            onChange={(v) => update({ hasApiDocumentation: v })}
            options={[
              { value: "yes", label: "Yes — documentation is available" },
              { value: "partial", label: "Partial — some documentation exists" },
              { value: "no", label: "No — no documentation available" },
            ]}
          />
        </FieldGroup>
      )}

      {/* Custom Branding */}
      <FieldGroup label="Do you require custom branding on the member-facing app / USSD?" hint="Custom branding allows the app to carry your SACCO's identity">
        <RadioGroup
          name="requiresCustomBranding"
          value={data.requiresCustomBranding || null}
          onChange={(v) => update({ requiresCustomBranding: v })}
          options={[
            { value: "yes", label: "Yes — we want our own brand identity" },
            { value: "no", label: "No — standard MySACCO branding is fine" },
          ]}
        />
      </FieldGroup>

      {/* Special Loan Products */}
      <SpecialLoanProductsField
        value={JSON.parse(data.specialLoanProducts || "[]")}
        onChange={(v) => update({ specialLoanProducts: JSON.stringify(v) })}
        otherItems={(() => { try { return JSON.parse(data.specialLoanProductsOther || "[]"); } catch { return []; } })()}
        onOtherChange={(items) => update({ specialLoanProductsOther: JSON.stringify(items) })}
      />

      {/* Additional Context */}
      <FieldGroup label="Any other requirements or context for the Safaricom team?" hint="Any additional information that would help us design the right solution for you">
        <Textarea
          rows={4}
          placeholder="Add any other relevant information, constraints, timeline pressures, or requirements…"
          value={data.additionalContext || ""}
          onChange={(e) => update({ additionalContext: e.target.value })}
        />
      </FieldGroup>

      {/* File Upload */}
      <FieldGroup label="Upload relevant documentation" hint="Optional — attach any documents that may help the Safaricom team (e.g. current system screenshots, existing API docs, organogram, loan product list)">
        <FileUpload
          value={uploadedFiles}
          onChange={(files) => update({ uploadedDocuments: JSON.stringify(files) })}
        />
      </FieldGroup>
    </div>
  );
}

// ─── Main Assessment Page ─────────────────────────────────────────────────────

export default function AssessmentPage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [localData, setLocalData] = useState<Partial<Assessment>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: assessment, isLoading, isError } = useQuery<Assessment>({
    queryKey: ["/api/assessments/code", code],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/assessments/code/${code}`);
      return r.json();
    },
    enabled: !!code,
  });

  // Sync remote -> local on load
  useEffect(() => {
    if (assessment) {
      setLocalData(assessment);
    }
  }, [assessment]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Assessment>) =>
      apiRequest("PATCH", `/api/assessments/${assessment!.id}`, data),
    onSuccess: async (res) => {
      const updated = await res.json();
      qc.setQueryData(["/api/assessments/code", code], updated);
      setLastSaved(new Date());
      setIsDirty(false);
    },
    onError: () => toast({ title: "Save failed", description: "Progress could not be saved.", variant: "destructive" }),
  });

  const update = useCallback((patch: Partial<Assessment>) => {
    setLocalData((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  // Auto-save every 30 seconds when dirty
  useEffect(() => {
    if (!isDirty || !assessment || saveMutation.isPending) return;
    const t = setTimeout(() => {
      saveMutation.mutate(localData);
    }, 30000);
    return () => clearTimeout(t);
  }, [isDirty, localData, assessment]);

  function saveProgress() {
    if (!assessment) return;
    setIsSaving(true);
    saveMutation.mutate(localData, {
      onSettled: () => setIsSaving(false),
    });
  }

  function handleNext() {
    // Save on step advance
    if (assessment && isDirty) saveMutation.mutate(localData);
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    if (assessment && isDirty) saveMutation.mutate(localData);
    setCurrentStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit() {
    if (!assessment) return;
    saveMutation.mutate(
      { ...localData, status: "submitted" },
      {
        onSuccess: () => setLocation(`/scorecard/${assessment.id}`),
        onError: () => toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Assessment Not Found</h2>
          <p className="text-muted-foreground">The access code <span className="font-mono font-bold">{code}</span> is invalid or has expired.</p>
          <Button onClick={() => setLocation("/")} variant="outline">Return Home</Button>
        </div>
      </div>
    );
  }

  // Already submitted
  if (assessment.status === "submitted" || assessment.status === "reviewed") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Assessment Submitted</h2>
            <p className="text-muted-foreground text-sm">
              Thank you — your assessment has been submitted and the Safaricom presales team will be in touch shortly.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setLocation(`/scorecard/${assessment.id}`)} className="bg-primary hover:bg-primary/90">
                View Scorecard
              </Button>
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(assessment.accessCode);
                toast({ title: "Copied", description: "Access code copied to clipboard." });
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Access Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPct = Math.round((currentStep / STEPS.length) * 100);
  const step = STEPS[currentStep - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-card border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-primary">MySACCO</span>
              <span className="text-xs text-muted-foreground hidden sm:block">Needs Assessment Questionnaire</span>
            </div>
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-[10px] text-muted-foreground hidden sm:block">
                  Saved {lastSaved.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={saveProgress}
                disabled={!isDirty || isSaving || saveMutation.isPending}
                data-testid="button-save-progress"
              >
                {(isSaving || saveMutation.isPending) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </Button>
              <div className="font-mono text-xs text-muted-foreground border rounded px-2 py-1">{assessment.accessCode}</div>
            </div>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
            <span className="text-xs text-muted-foreground">{progressPct}% complete</span>
          </div>
        </div>
      </header>

      {/* Step pills */}
      <div className="bg-muted/30 border-b overflow-x-auto">
        <div className="max-w-2xl mx-auto px-4 py-2 flex gap-2 min-w-max">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (assessment && isDirty) saveMutation.mutate(localData);
                setCurrentStep(s.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                s.id === currentStep
                  ? "bg-primary text-white border-primary font-semibold"
                  : s.id < currentStep
                  ? "bg-primary/10 text-primary border-primary/30 font-medium"
                  : "bg-background text-muted-foreground border-border"
              }`}
              data-testid={`step-pill-${s.id}`}
            >
              {s.id < currentStep && "✓ "}{s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main form */}
      <main className="max-w-2xl mx-auto px-4 py-8 pb-32">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">{step.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
        </div>

        {currentStep === 1 && <Step1 data={localData} update={update} />}
        {currentStep === 2 && <Step2 data={localData} update={update} />}
        {currentStep === 3 && <Step3 data={localData} update={update} />}
        {currentStep === 4 && <Step4 data={localData} update={update} />}
        {currentStep === 5 && <Step5 data={localData} update={update} />}
        {currentStep === 6 && <Step6 data={localData} update={update} />}

        {/* Auto-save note */}
        {isDirty && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Save className="h-3 w-3" />
            <span>Unsaved changes — your progress auto-saves every 30 seconds, or click Save above</span>
          </div>
        )}
      </main>

      {/* Sticky footer nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t shadow-lg z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-1.5"
            data-testid="button-prev"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="text-xs text-muted-foreground hidden sm:block">
            {step.title} ({currentStep}/{STEPS.length})
          </div>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 gap-1.5" data-testid="button-next">
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 gap-1.5"
              data-testid="button-submit"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Submit Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
