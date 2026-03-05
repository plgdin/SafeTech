import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface UserReport {
  report_type: string;
  content: string;
  status: string;
  reference_id?: string; // Production Tracking ID
}

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
     2. CITIZEN REPORTING (Production Ready)
     ========================================= */
     
  async submitReport(report: UserReport) {
    // Maps forensic payload to the citizen_reports table
    return await this.supabase.from('citizen_reports').insert([
      {
        report_type: report.report_type,
        evidence_payload: report.content,
        status: report.status,
        reference_id: report.reference_id // Production ID storage
      }
    ]);
  }

  // Production-ready lookup for the Tracking Panel
  async getReportStatus(refId: string) {
    return await this.supabase
      .from('citizen_reports')
      .select('status, created_at')
      .eq('reference_id', refId)
      .single();
  }

  /* =========================================
     3. SCAM AWARENESS BACKEND
     ========================================= */
     
  async getScams() {
    return await this.supabase
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
  }
}