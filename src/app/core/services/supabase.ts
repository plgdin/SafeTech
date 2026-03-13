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

  /* --- 1. PHISHING TOOLS --- */
  async checkPhishingUrl(url: string): Promise<{ isSafe: boolean; details: string } | null> {
    const { data, error } = await this.supabase
      .from('phishing_logs')
      .select('is_safe, threat_details')
      .eq('scanned_url', url)
      .eq('is_safe', false)
      .limit(1)
      .maybeSingle();

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

  /* --- 2. CITIZEN REPORTING --- */
  async submitReport(report: UserReport) {
    return await this.supabase.from('citizen_reports').insert([
      {
        report_type: report.report_type,
        evidence_payload: report.content,
        status: report.status,
        reference_id: report.reference_id 
      }
    ]);
  }

  async getReportStatus(refId: string) {
    return await this.supabase
      .from('citizen_reports')
      .select('status, created_at')
      .eq('reference_id', refId)
      .single();
  }

  /* --- 3. SCAMS --- */
  async getScams() {
    return await this.supabase
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /* --- 4. ADMIN & CHAT LOGS --- */
  async saveChatLog(userMsg: string, botRes: string) {
    const { data, error } = await this.supabase
      .from('chatbot_logs')
      .insert([
        {
          user_message: userMsg,
          bot_response: botRes
        }
      ]);

    if (error) {
      console.error("Supabase Insert Error:", error);
    }

    return { data, error };
  }

  async getChatLogs() {
    return await this.supabase
      .from('chatbot_logs')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async getAllTrainingData() {
    const { data: bookings } = await this.supabase.from('bookings').select('*').order('created_at', { ascending: false });
    const { data: trainers } = await this.supabase.from('trainers').select('*').order('created_at', { ascending: false });
    return { bookings: bookings || [], trainers: trainers || [] };
  }

  async getAdminDashboardData() {
    // Parallel fetching for performance
    const [reports, training, phishing, chats] = await Promise.all([
      this.supabase.from('citizen_reports').select('*').order('created_at', { ascending: false }),
      this.getAllTrainingData(),
      this.supabase.from('phishing_logs').select('*').order('created_at', { ascending: false }),
      this.getChatLogs()
    ]);

    return {
      reports: reports.data || [],
      bookings: training.bookings || [],
      trainers: training.trainers || [],
      phishingLogs: phishing.data || [],
      chatLogs: chats.data || []
    };
  }

  /* --- 5. EXTERNAL THREAT INTELLIGENCE --- */
  async checkVirusTotal(url: string): Promise<any> {
    const apiKey = environment.virusTotalApiKey;
    if (!apiKey) {
      console.warn('VirusTotal API Key missing from environment.');
      return null;
    }
    
    // Standard VT encoding: base64 without padding
    const urlId = btoa(url).replace(/=/g, ''); 
    
    const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null; // Not found in VT database
      throw new Error('VirusTotal lookup failed');
    }
    
    return await response.json();
  }
}