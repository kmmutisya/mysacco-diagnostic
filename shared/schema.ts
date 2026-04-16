import { pgTable, text, integer, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ------- SACCO Lead Assessment -------
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  accessCode: text("access_code").notNull().unique(),
  status: text("status").notNull().default("draft"), // draft | submitted | reviewed

  // Section 1: SACCO Identity
  saccoName: text("sacco_name"),
  saccoType: text("sacco_type"), // DT-SACCO | Non-DT-SACCO
  sasraLicensed: text("sasra_licensed"), // yes | no | pending
  industry: text("industry"),
  industryOther: text("industry_other"),
  county: text("county"),
  contactPersonName: text("contact_person_name"),
  contactPersonTitle: text("contact_person_title"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),

  // Section 2: Membership & Scale
  totalMembers: text("total_members"),
  memberGrowthRate: text("member_growth_rate"),
  avgMonthlyLoans: text("avg_monthly_loans"),
  monthlyTransactionVolume: text("monthly_transaction_volume"),
  hasFosa: text("has_fosa"), // yes | no
  hasBosa: text("has_bosa"), // yes | no

  // Section 3: Technology Proficiency
  currentCoreSystem: text("current_core_system"),
  currentCoreSystemOther: text("current_core_system_other"),
  coreSystemAge: text("core_system_age"),
  hasVendorRelationship: text("has_vendor_relationship"),
  vendorName: text("vendor_name"),
  vendorCanAssist: text("vendor_can_assist"),
  hasSandbox: text("has_sandbox"),
  hasMobileApp: text("has_mobile_app"),
  hasUssd: text("has_ussd"),
  hasWebPortal: text("has_web_portal"),
  digitalChannelsAge: text("digital_channels_age"),
  digitalChannelFeatures: text("digital_channel_features"), // JSON array
  expectedDigitalTraffic: text("expected_digital_traffic"),
  onboardsViaDigital: text("onboards_via_digital"),
  existingPaybill: text("existing_paybill"),
  paybillNumber: text("paybill_number"),
  paybillOneAccount: text("paybill_one_account"),
  itStaffCount: text("it_staff_count"),
  memberDigitalAdoptionRate: text("member_digital_adoption_rate"),
  techProficiencyScore: integer("tech_proficiency_score"),

  // Section 4: Financial Accounting Proficiency
  accountingSystem: text("accounting_system"),
  chartOfAccountsSetup: text("chart_of_accounts_setup"),
  reconciliationFrequency: text("reconciliation_frequency"),
  sasraReportingCapability: text("sasra_reporting_capability"),
  financialStaffCount: text("financial_staff_count"),
  accountingProficiencyScore: integer("accounting_proficiency_score"),

  // Section 5: Pain Points & Needs
  painPoints: text("pain_points"), // JSON array
  painPointsOther: text("pain_points_other"),
  topPriority: text("top_priority"),
  memberComplaintTypes: text("member_complaint_types"), // JSON array
  memberComplaintsOther: text("member_complaints_other"),
  desiredOutcomes: text("desired_outcomes"), // JSON array
  desiredOutcomesOther: text("desired_outcomes_other"),
  solutionUrgency: text("solution_urgency"),
  preferredRolloutTimeline: text("preferred_rollout_timeline"),

  // Section 6: Requirements Assessment
  requiresDataMigration: text("requires_data_migration"),
  dataMigrationComplexity: text("data_migration_complexity"),
  requiresCustomIntegration: text("requires_custom_integration"),
  integrationDetails: text("integration_details"),
  hasApiDocumentation: text("has_api_documentation"),
  requiresCustomBranding: text("requires_custom_branding"),
  specialLoanProducts: text("special_loan_products"), // JSON array
  specialLoanProductsOther: text("special_loan_products_other"), // JSON array
  additionalContext: text("additional_context"),
  uploadedDocuments: text("uploaded_documents"), // JSON array
  availabilitySlots: text("availability_slots"), // JSON array
  complexityRating: text("complexity_rating"),

  // Section 7: Presales Notes
  presalesNotes: text("presales_notes"),
  recommendedModel: text("recommended_model"),
  estimatedRevenue: real("estimated_revenue"),
  estimatedRevenueBreakdown: text("estimated_revenue_breakdown"), // JSON
  pwinScore: integer("pwin_score"),
  nextSteps: text("next_steps"),

  // Metadata
  submittedAt: text("submitted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by"),
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
});
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type Assessment = typeof assessments.$inferSelect;
