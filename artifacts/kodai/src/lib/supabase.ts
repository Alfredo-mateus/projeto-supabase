import { createClient } from "@supabase/supabase-js";

  const SUPABASE_URL = "https://grjmugbfhunbkjyodhzu.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyam11Z2JmaHVuYmtqeW9kaHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTg0NjMsImV4cCI6MjA5NTU3NDQ2M30.ZWkw2bvDwrk-uOXlh-RU1t2cVluWawPi1EQc9a5Lx5Y";

  export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  export type Profile = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: "student" | "admin";
    created_at: string;
  };

  export type Enrollment = {
    id: string;
    user_id: string | null;
    full_name: string;
    phone: string;
    email: string;
    status: "pending" | "approved" | "rejected";
    payment_proof_url: string | null;
    rejection_reason: string | null;
    created_at: string;
  };

  export type Lesson = {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    order_index: number;
    created_at: string;
  };

  export type LessonProgress = {
    id: string;
    user_id: string;
    lesson_id: string;
    completed: boolean;
    completed_at: string | null;
  };

  export type SiteSettings = {
    landing_video_url?: string;
    course_price?: string;
    currency?: string;
    payment_bank?: string;
    payment_iban?: string;
    payment_name?: string;
    payment_reference?: string;
    [key: string]: string | undefined;
  };

  export async function loadSiteSettings(): Promise<SiteSettings> {
    const { data } = await supabase.from("site_settings").select("key, value");
    if (!data) return {};
    return data.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as SiteSettings);
  }
  