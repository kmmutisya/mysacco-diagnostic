import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { assessments, type Assessment, type InsertAssessment } from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("railway.internal")
    ? false  // internal private network — no SSL needed
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected DB pool error", err);
});

export const db = drizzle(pool);

// Create table if not exists — PostgreSQL DDL
async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assessments (
      id SERIAL PRIMARY KEY,
      access_code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',

      -- Section 1: SACCO Identity
      sacco_name TEXT,
      sacco_type TEXT,
      sasra_licensed TEXT,
      industry TEXT,
      industry_other TEXT,
      county TEXT,
      contact_person_name TEXT,
      contact_person_title TEXT,
      contact_email TEXT,
      contact_phone TEXT,

      -- Section 2: Membership & Scale
      total_members TEXT,
      member_growth_rate TEXT,
      avg_monthly_loans TEXT,
      monthly_transaction_volume TEXT,
      has_fosa TEXT,
      has_bosa TEXT,

      -- Section 3: Technology Proficiency
      current_core_system TEXT,
      current_core_system_other TEXT,
      core_system_age TEXT,
      has_vendor_relationship TEXT,
      vendor_name TEXT,
      vendor_can_assist TEXT,
      has_sandbox TEXT,
      has_mobile_app TEXT,
      has_ussd TEXT,
      has_web_portal TEXT,
      digital_channels_age TEXT,
      digital_channel_features TEXT,
      expected_digital_traffic TEXT,
      onboards_via_digital TEXT,
      existing_paybill TEXT,
      paybill_number TEXT,
      paybill_one_account TEXT,
      it_staff_count TEXT,
      member_digital_adoption_rate TEXT,
      tech_proficiency_score INTEGER,

      -- Section 4: Financial Accounting
      accounting_system TEXT,
      chart_of_accounts_setup TEXT,
      reconciliation_frequency TEXT,
      sasra_reporting_capability TEXT,
      financial_staff_count TEXT,
      accounting_proficiency_score INTEGER,

      -- Section 5: Pain Points & Needs
      pain_points TEXT,
      pain_points_other TEXT,
      top_priority TEXT,
      member_complaint_types TEXT,
      member_complaints_other TEXT,
      desired_outcomes TEXT,
      desired_outcomes_other TEXT,
      solution_urgency TEXT,
      preferred_rollout_timeline TEXT,

      -- Section 6: Requirements
      requires_data_migration TEXT,
      data_migration_complexity TEXT,
      requires_custom_integration TEXT,
      integration_details TEXT,
      has_api_documentation TEXT,
      requires_custom_branding TEXT,
      special_loan_products TEXT,
      special_loan_products_other TEXT,
      additional_context TEXT,
      uploaded_documents TEXT,
      availability_slots TEXT,
      complexity_rating TEXT,

      -- Presales Notes
      presales_notes TEXT,
      recommended_model TEXT,
      estimated_revenue REAL,
      estimated_revenue_breakdown TEXT,
      pwin_score INTEGER,
      next_steps TEXT,

      -- Metadata
      submitted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT
    )
  `);
}

// Run migrations on startup with retry — exported so server/index.ts can await it
async function runMigrationsWithRetry(retries = 10, delayMs = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await runMigrations();
      console.log("Database migrations complete");
      return;
    } catch (err: any) {
      console.error(`Migration attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

export { runMigrationsWithRetry as runMigrations };

export interface IStorage {
  createAssessment(code: string): Promise<Assessment>;
  getAssessmentByCode(code: string): Promise<Assessment | undefined>;
  getAssessmentById(id: number): Promise<Assessment | undefined>;
  getAllAssessments(): Promise<Assessment[]>;
  updateAssessment(id: number, data: Partial<InsertAssessment>): Promise<Assessment | undefined>;
  deleteAssessment(id: number): Promise<void>;
}

export class Storage implements IStorage {
  async createAssessment(code: string): Promise<Assessment> {
    const now = new Date().toISOString();
    const result = await db.insert(assessments).values({
      accessCode: code,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    }).returning();
    return result[0];
  }

  async getAssessmentByCode(code: string): Promise<Assessment | undefined> {
    const result = await db.select().from(assessments).where(eq(assessments.accessCode, code));
    return result[0];
  }

  async getAssessmentById(id: number): Promise<Assessment | undefined> {
    const result = await db.select().from(assessments).where(eq(assessments.id, id));
    return result[0];
  }

  async getAllAssessments(): Promise<Assessment[]> {
    return db.select().from(assessments);
  }

  async updateAssessment(id: number, data: Partial<InsertAssessment>): Promise<Assessment | undefined> {
    const now = new Date().toISOString();
    const result = await db.update(assessments)
      .set({ ...data, updatedAt: now })
      .where(eq(assessments.id, id))
      .returning();
    return result[0];
  }

  async deleteAssessment(id: number): Promise<void> {
    await db.delete(assessments).where(eq(assessments.id, id));
  }
}

export const storage = new Storage();
