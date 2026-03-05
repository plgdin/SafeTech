import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface UserReport {
  report_type: string;
  content: string;
  status: string;
}

// FIXED: Added type and severity to bridge the gap between the DB and your HTML
export interface Scam {
  id?: string;
  title: string;
  description: string;
  category?: string;
  type?: string;       
  risk_level?: string;
  severity?: string;   
  created_at?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Initialize Supabase client. Ensure you have these in your environment.ts
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  /* =========================================
     1. PHISHING / URL SAFEGUARD BACKEND
     ========================================= */
  
  async checkPhishingUrl(url: string): Promise<{ isSafe: boolean; details: string } | null> {
    const { data, error } = await this.supabase
      .from('phishing_logs')
      .select('is_safe, threat_details')
      .eq('scanned_url', url)
      .eq('is_safe', false)
      .limit(1)
      .single();

    if (error || !data) return null; 
    return { isSafe: data.is_safe, details: data.threat_details };
  }

  async logPhishingAudit(url: string, score: number, details: string, markers: string[], isSafe: boolean) {
    return await this.supabase.from('phishing_logs').insert([
      {
        scanned_url: url,
        risk_score: score,
        threat_details: details,
        forensic_markers: markers,
        is_safe: isSafe
      }
    ]);
  }

  /* =========================================
     2. FAKE NEWS / DEEPFAKE BACKEND
     ========================================= */
     
  async logFakeNewsAnalysis(snippet: string, score: number, keywords: string[]) {
    return await this.supabase.from('fake_news_logs').insert([
      {
        content_snippet: snippet,
        ai_confidence_score: score,
        flagged_keywords: keywords
      }
    ]);
  }

  /* =========================================
     3. CITIZEN REPORTING (To KSITM)
     ========================================= */
     
  async submitReport(report: UserReport) {
    return await this.supabase.from('citizen_reports').insert([
      {
        report_type: report.report_type,
        evidence_payload: report.content,
        status: report.status
      }
    ]);
  }

  /* =========================================
     4. SCAM AWARENESS BACKEND
     ========================================= */
     
  async getScams() {
    return await this.supabase
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
  }
}