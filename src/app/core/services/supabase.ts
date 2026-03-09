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
  
  /**
   * Checks if a URL has been previously flagged as malicious.
   *
   */
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

  /**
   * Logs a phishing scan audit for forensic tracking.
   *
   */
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
     
  /**
   * Submits a new forensic report from a citizen.
   *
   */
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

  /**
   * Retrieves the current status of a report via its Reference ID.
   *
   */
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
     
  /**
   * Retrieves a list of recent scams for public awareness.
   *
   */
  async getScams() {
    return await this.supabase
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /* =========================================
     4. ADMIN PANEL & CHATBOT BACKEND
     ========================================= */

  /**
   * Logs chatbot interactions for administrative visibility.
   *
   */
  async saveChatLog(userMsg: string, botRes: string) {
    return await this.supabase.from('chatbot_logs').insert([
      { 
        user_message: userMsg, 
        bot_response: botRes 
      }
    ]);
  }

  /**
   * Retrieves all chatbot logs, sorted by most recent.
   *
   */
  async getChatLogs() {
    return await this.supabase
      .from('chatbot_logs')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /**
   * Fetches all training data, including session bookings and trainer applications.
   *
   */
  async getAllTrainingData() {
    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: trainers } = await this.supabase
      .from('trainers')
      .select('*')
      .order('created_at', { ascending: false });

    return { bookings, trainers };
  }

  /**
   * Fetches the complete history of phishing checker logs.
   *
   */
  async getAllPhishingLogs() {
    return await this.supabase
      .from('phishing_logs')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /**
   * Retrieves all citizen-submitted reports for administrative review.
   *
   */
  async getAllCitizenReports() {
    return await this.supabase
      .from('citizen_reports')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /**
   * Aggregates all system data into a single dashboard payload for the admin panel.
   *
   */
  async getAdminDashboardData() {
    const { data: reports } = await this.getAllCitizenReports();
    const { bookings, trainers } = await this.getAllTrainingData();
    const { data: phishingLogs } = await this.getAllPhishingLogs();
    const { data: chatLogs } = await this.getChatLogs();

    return {
      reports,
      bookings,
      trainers,
      phishingLogs,
      chatLogs
    };
  }
}