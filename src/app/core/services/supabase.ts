import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// ─── INTERFACES ────────────────────────────────────────────────────────────

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

export interface AdminReport {
  id?: string | number;
  reference_id?: string;
  report_type: string;
  evidence_payload: string;
  status: string;
  created_at?: string;
}

export interface TrainingBooking {
  id?: string | number;
  org_type?: string;
  address?: string;
  event_date?: string;
  event_time?: string;
  mode?: string;
  phone?: string;
  email?: string;
  status?: string;
  admin_message?: string;
  created_at?: string;
}

export interface TrainerApplication {
  id?: string | number;
  name?: string;
  age?: number;
  location?: string;
  education?: string;
  phone?: string;
  status?: string;
  admin_message?: string;
  created_at?: string;
}

export interface TrainingMessage {
  id?: string | number;
  audience: string;
  subject: string;
  message: string;
  target_table?: string;
  target_id?: string;
  created_at?: string;
}

export interface TrainingResource {
  id?: string | number;
  title: string;
  description?: string;
  resource_type: 'video' | 'notes';
  file_name?: string;
  file_url?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (environment.supabaseUrl && environment.supabaseKey) {
      this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    } else {
      console.warn('Supabase config missing. Data-backed features are running in safe fallback mode.');
    }
  }

  private get client(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase client unavailable');
    }
    return this.supabase;
  }

  // ─── 1. PHISHING TOOLS (UPDATED) ──────────────────────────────────────────

  async checkPhishingUrl(url: string): Promise<{ isSafe: boolean; details: string } | null> {
    if (!this.supabase) return null;
    const { data, error } = await this.client
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
    if (!this.supabase) return { data: null, error: new Error('Supabase client unavailable') };

    return await this.client.from('phishing_logs').insert([{
      scanned_url: url,
      risk_score: score,
      threat_details: details,
      forensic_markers: markers,
      is_safe: isSafe
    }]);
  }

  /**
   * ADMIN ONLY: Finalizes a user's Flag/Vouch request.
   * Updates report status and upserts the permanent URL database.
   */
  async resolvePhishingReport(reportId: string | number, url: string, isAdminVerifiedSafe: boolean, adminNotes: string) {
    if (!this.supabase) return { error: new Error('Supabase unavailable') };

    // 1. Mark report as resolved
    const reportUpdate = await this.client
      .from('citizen_reports')
      .update({ status: 'resolved' })
      .eq('id', reportId);

    if (reportUpdate.error) return reportUpdate;

    // 2. Overwrite/Update live DB score based on Admin Authority
    return await this.client
      .from('phishing_logs')
      .upsert([{
        scanned_url: url,
        risk_score: isAdminVerifiedSafe ? 0 : 100,
        threat_details: isAdminVerifiedSafe ? `Vouched Safe by Admin: ${adminNotes}` : `Flagged Malicious by Admin: ${adminNotes}`,
        forensic_markers: ['Admin Reviewed', isAdminVerifiedSafe ? 'Verified Safe' : 'Verified Threat'],
        is_safe: isAdminVerifiedSafe
      }], { onConflict: 'scanned_url' });
  }

  // ─── 2. CITIZEN REPORTING ────────────────────────────────────────────────

  async submitReport(report: UserReport) {
    if (!this.supabase) return { data: null, error: new Error('Supabase client unavailable') };
    return await this.client.from('citizen_reports').insert([{
      report_type: report.report_type,
      evidence_payload: report.content,
      status: report.status,
      reference_id: report.reference_id 
    }]);
  }

  async getReportStatus(refId: string) {
    if (!this.supabase) return { data: null, error: new Error('Supabase client unavailable') };
    return await this.client
      .from('citizen_reports')
      .select('status, created_at')
      .eq('reference_id', refId)
      .maybeSingle();
  }

  // ─── 3. SCAMS ─────────────────────────────────────────────────────────────

  async getScams() {
    if (!this.supabase) return { data: [], error: new Error('Supabase client unavailable') };
    return await this.client
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
  }

  // ─── 4. ADMIN & CHAT LOGS ─────────────────────────────────────────────────

  async saveChatLog(userMsg: string, botRes: string) {
    if (!this.supabase) return { data: null, error: new Error('Supabase client unavailable') };
    return await this.client.from('chatbot_logs').insert([{
      user_message: userMsg,
      bot_response: botRes
    }]);
  }

  async getChatLogs() {
    if (!this.supabase) return { data: [], error: new Error('Supabase client unavailable') };
    return await this.client
      .from('chatbot_logs')
      .select('*')
      .order('created_at', { ascending: false });
  }

  // ─── 5. ADMIN DASHBOARD & TRAINING TOOLS ──────────────────────────────────

  async getAdminDashboardPrimaryData() {
    const [reports, bookings, trainers] = await Promise.all([
      this.client.from('citizen_reports').select('id, reference_id, report_type, evidence_payload, status, created_at').order('created_at', { ascending: false }).limit(100),
      this.client.from('bookings').select('id, org_type, address, event_date, event_time, mode, phone, email, status, admin_message, created_at').order('created_at', { ascending: false }).limit(50),
      this.client.from('trainers').select('id, name, age, location, education, phone, status, admin_message, created_at').order('created_at', { ascending: false }).limit(50)
    ]);
    return { reports: reports.data || [], bookings: bookings.data || [], trainers: trainers.data || [] };
  }

  async getAdminDashboardSecondaryData() {
    if (!this.supabase) return { chatLogs: [], trainingMessages: [], trainingResources: [] };
    const [chats, trainingMessages, trainingResources] = await Promise.all([
      this.client.from('chatbot_logs').select('id, user_message, bot_response, created_at').order('created_at', { ascending: false }).limit(50),
      this.client.from('training_messages').select('id, audience, subject, message, target_table, target_id, created_at').order('created_at', { ascending: false }).limit(20),
      this.client.from('training_resources').select('id, title, description, resource_type, file_name, file_url, created_at').order('created_at', { ascending: false }).limit(20)
    ]);
    return { chatLogs: chats.data || [], trainingMessages: trainingMessages.data || [], trainingResources: trainingResources.data || [] };
  }

  async getAdminDashboardData() {
    const [primary, secondary] = await Promise.all([this.getAdminDashboardPrimaryData(), this.getAdminDashboardSecondaryData()]);
    return { reports: primary.reports, phishingLogs: [], chatLogs: secondary.chatLogs, bookings: primary.bookings, trainers: primary.trainers, trainingMessages: secondary.trainingMessages, trainingResources: secondary.trainingResources };
  }

  async getReports(sortField: keyof AdminReport = 'created_at', ascending = false, status?: string) {
    if (!this.supabase) return { data: [], error: new Error('Supabase client unavailable') };
    let query = this.client.from('citizen_reports').select('*').order(sortField as string, { ascending });
    if (status && status !== 'all') query = query.eq('status', status);
    return await query;
  }

  async updateReportStatus(reportId: string | number | undefined, referenceId: string | undefined, status: string) {
    if (!this.supabase) return { data: null, error: new Error('Supabase client unavailable') };
    const query = this.client.from('citizen_reports').update({ status });
    if (reportId !== undefined && reportId !== null) return await query.eq('id', reportId).select().single();
    return await query.eq('reference_id', referenceId).select().single();
  }

  async updateTrainingStatus(table: 'bookings' | 'trainers', rowId: string | number, status: string, adminMessage?: string) {
    const payload: { status: string; admin_message?: string } = { status };
    if (adminMessage !== undefined) payload.admin_message = adminMessage;
    if (!this.supabase) return { data: null, error: new Error('Supabase client unavailable') };
    return await this.client.from(table).update(payload).eq('id', rowId).select().single();
  }

  async createTrainingMessage(message: TrainingMessage) {
    if (!this.supabase) return { data: null, error: new Error('Supabase client unavailable') };
    return await this.client.from('training_messages').insert([message]).select().single();
  }

  async uploadTrainingResource(file: File, resource: Pick<TrainingResource, 'title' | 'description' | 'resource_type'>) {
    if (!this.supabase) return { data: null, error: new Error('Supabase client unavailable') };
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const filePath = `${resource.resource_type}/${Date.now()}-${safeName}`;
    const uploadResult = await this.client.storage.from('training-assets').upload(filePath, file, { upsert: false });
    if (uploadResult.error) return { data: null, error: uploadResult.error };
    const { data: publicUrlData } = this.client.storage.from('training-assets').getPublicUrl(filePath);
    return await this.client.from('training_resources').insert([{ ...resource, file_name: safeName, file_url: publicUrlData.publicUrl }]).select().single();
  }
}