import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface UserReport {
  report_type: string;
  content: string;
  status: string;
  reference_id?: string;
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
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  /* --- 1. PHISHING TOOLS (UPDATED FOR ZERO-TRUST) --- */
  async checkPhishingUrl(url: string): Promise<{ isSafe: boolean; details: string } | null> {
    // We strictly check for entries where the URL was already flagged as unsafe.
    // .maybeSingle() is critical here to avoid the 406 error when a URL is clean/new.
    const { data, error } = await this.supabase
      .from('phishing_logs')
      .select('is_safe, threat_details')
      .eq('scanned_url', url)
      .eq('is_safe', false)
      .limit(1)
      .maybeSingle(); 

    if (error || !data) return null; 
    return { isSafe: data.is_safe, details: data.threat_details || 'Flagged by community report' };
  }

  async logPhishingAudit(url: string, score: number, details: string, markers: string[], isSafe: boolean) {
    // This logs the RAW results from your component (including VirusTotal detections)
    return await this.supabase.from('phishing_logs').insert([{
      scanned_url: url,
      risk_score: score,
      threat_details: details,
      forensic_markers: markers, // This stores the raw detection count (e.g., "1/70 engines")
      is_safe: isSafe
    }]);
  }

  /* --- 2. CITIZEN REPORTING (NOT TOUCHED) --- */
  async submitReport(report: UserReport) {
    return await this.supabase.from('citizen_reports').insert([{
      report_type: report.report_type,
      evidence_payload: report.content,
      status: report.status,
      reference_id: report.reference_id 
    }]);
  }

  async getReportStatus(refId: string) {
    return await this.supabase
      .from('citizen_reports')
      .select('status, created_at')
      .eq('reference_id', refId)
      .maybeSingle();
  }

  /* --- 3. SCAMS (NOT TOUCHED) --- */
  async getScams() {
    return await this.supabase
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /* --- 4. ADMIN & CHAT LOGS (NOT TOUCHED) --- */
  async saveChatLog(userMsg: string, botRes: string) {
    return await this.supabase.from('chatbot_logs').insert([{
      user_message: userMsg,
      bot_response: botRes
    }]);
  }

  async getChatLogs() {
    return await this.supabase
      .from('chatbot_logs')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async getAdminDashboardData() {
    const [reports, phishing, chats] = await Promise.all([
      this.supabase.from('citizen_reports').select('*').order('created_at', { ascending: false }),
      this.supabase.from('phishing_logs').select('*').order('created_at', { ascending: false }),
      this.supabase.from('chatbot_logs').select('*').order('created_at', { ascending: false })
    ]);

    return {
      reports: reports.data || [],
      phishingLogs: phishing.data || [],
      chatLogs: chats.data || []
    };
  }
}