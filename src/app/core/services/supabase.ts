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
    const [reports, phishing, chats, bookings, trainers, trainingMessages, trainingResources] = await Promise.all([
      this.supabase.from('citizen_reports').select('*').order('created_at', { ascending: false }),
      this.supabase.from('phishing_logs').select('*').order('created_at', { ascending: false }),
      this.supabase.from('chatbot_logs').select('*').order('created_at', { ascending: false }),
      this.supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      this.supabase.from('trainers').select('*').order('created_at', { ascending: false }),
      this.supabase.from('training_messages').select('*').order('created_at', { ascending: false }),
      this.supabase.from('training_resources').select('*').order('created_at', { ascending: false })
    ]);

    return {
      reports: reports.data || [],
      phishingLogs: phishing.data || [],
      chatLogs: chats.data || [],
      bookings: bookings.data || [],
      trainers: trainers.data || [],
      trainingMessages: trainingMessages.data || [],
      trainingResources: trainingResources.data || []
    };
  }

  async getReports(sortField: keyof AdminReport = 'created_at', ascending = false, status?: string) {
    let query = this.supabase
      .from('citizen_reports')
      .select('*')
      .order(sortField as string, { ascending });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    return await query;
  }

  async updateReportStatus(reportId: string | number | undefined, referenceId: string | undefined, status: string) {
    const query = this.supabase.from('citizen_reports').update({ status });

    if (reportId !== undefined && reportId !== null) {
      return await query.eq('id', reportId).select().single();
    }

    return await query.eq('reference_id', referenceId).select().single();
  }

  async updateTrainingStatus(table: 'bookings' | 'trainers', rowId: string | number, status: string, adminMessage?: string) {
    const payload: { status: string; admin_message?: string } = { status };
    if (adminMessage !== undefined) {
      payload.admin_message = adminMessage;
    }

    return await this.supabase
      .from(table)
      .update(payload)
      .eq('id', rowId)
      .select()
      .single();
  }

  async createTrainingMessage(message: TrainingMessage) {
    return await this.supabase
      .from('training_messages')
      .insert([message])
      .select()
      .single();
  }

  async uploadTrainingResource(file: File, resource: Pick<TrainingResource, 'title' | 'description' | 'resource_type'>) {
    const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const filePath = `${resource.resource_type}/${Date.now()}-${safeName}`;

    const uploadResult = await this.supabase.storage
      .from('training-assets')
      .upload(filePath, file, { upsert: false });

    if (uploadResult.error) {
      return { data: null, error: uploadResult.error };
    }

    const { data: publicUrlData } = this.supabase.storage
      .from('training-assets')
      .getPublicUrl(filePath);

    return await this.supabase
      .from('training_resources')
      .insert([{
        ...resource,
        file_name: safeName,
        file_ext: fileExt,
        file_url: publicUrlData.publicUrl
      }])
      .select()
      .single();
  }
}
