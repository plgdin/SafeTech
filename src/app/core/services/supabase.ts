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
  id?: string; // Changed to string for custom UID
  name?: string;
  age?: number;
  location?: string;
  education?: string;
  phone?: string;
  email?: string;
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
    }
  }

  private get client(): SupabaseClient {
    if (!this.supabase) throw new Error('Supabase client unavailable');
    return this.supabase;
  }

  // --- AUTH & UMS CORE METHODS ---

  async registerTrainer(trainerData: any) {
    const { data, error } = await this.client
      .from('trainers')
      .insert([{
        ...trainerData,
        status: 'pending'
      }])
      .select()
      .single();

    return { data, error, generatedUid: data?.id ?? null };
  }

  async sendRegistrationEmail(email: string, uid: string, name?: string) {
    if (!environment.googleScriptUrl) {
      return { data: null, error: new Error('Google Script URL is not configured.') };
    }

    try {
      const response = await fetch(environment.googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'sendTrainerUidEmail',
          email,
          uid,
          name: name || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Email request failed with status ${response.status}.`);
      }

      const raw = await response.text();
      let parsed: any = null;

      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = raw;
      }

      if (parsed && typeof parsed === 'object' && parsed.success === false) {
        throw new Error(parsed.message || 'UID email could not be sent.');
      }

      return { data: parsed, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('UID email request failed.')
      };
    }
  }

  async sendSetupEmail(email: string, uid?: string) {
    return await this.sendRegistrationEmail(email, uid ?? '');
  }

  async getTrainerByUid(uid: string) {
    return await this.client
      .from('trainers')
      .select('*')
      .eq('id', uid)
      .single();
  }

  // --- EXISTING FUNCTIONAL METHODS ---

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
    return await this.client.from('phishing_logs').insert([{
      scanned_url: url,
      risk_score: score,
      threat_details: details,
      forensic_markers: markers,
      is_safe: isSafe
    }]);
  }

  async resolvePhishingReport(reportId: string | number, url: string, isAdminVerifiedSafe: boolean, adminNotes: string) {
    const reportUpdate = await this.client
      .from('citizen_reports')
      .update({ status: 'resolved' })
      .eq('id', reportId);

    if (reportUpdate.error) return reportUpdate;

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

  async submitReport(report: UserReport) {
    return await this.client.from('citizen_reports').insert([{
      report_type: report.report_type,
      evidence_payload: report.content,
      status: report.status,
      reference_id: report.reference_id 
    }]);
  }

  async getReportStatus(refId: string) {
    return await this.client
      .from('citizen_reports')
      .select('status, created_at')
      .eq('reference_id', refId)
      .maybeSingle();
  }

  async getScams() {
    return await this.client
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async saveChatLog(userMsg: string, botRes: string) {
    return await this.client.from('chatbot_logs').insert([{
      user_message: userMsg,
      bot_response: botRes
    }]);
  }

  async getChatLogs() {
    return await this.client
      .from('chatbot_logs')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async getAdminDashboardPrimaryData() {
    const [reports, bookings, trainers] = await Promise.all([
      this.client.from('citizen_reports').select('id, reference_id, report_type, evidence_payload, status, created_at').order('created_at', { ascending: false }).limit(100),
      this.client.from('bookings').select('id, org_type, address, event_date, event_time, mode, phone, email, status, admin_message, created_at').order('created_at', { ascending: false }).limit(50),
      this.client.from('trainers').select('id, name, age, location, education, phone, email, status, admin_message, created_at').order('created_at', { ascending: false }).limit(50)
    ]);
    return { reports: reports.data || [], bookings: bookings.data || [], trainers: trainers.data || [] };
  }

  async getAdminDashboardSecondaryData() {
    const [chats, trainingMessages, trainingResources] = await Promise.all([
      this.client.from('chatbot_logs').select('id, user_message, bot_response, created_at').order('created_at', { ascending: false }).limit(50),
      this.client.from('training_messages').select('id, audience, subject, message, target_table, target_id, created_at').order('created_at', { ascending: false }).limit(20),
      this.client.from('training_resources').select('id, title, description, resource_type, file_name, file_url, created_at').order('created_at', { ascending: false }).limit(20)
    ]);
    return { chatLogs: chats.data || [], trainingMessages: trainingMessages.data || [], trainingResources: trainingResources.data || [] };
  }

  async updateReportStatus(reportId: string | number | undefined, referenceId: string | undefined, status: string) {
    const query = this.client.from('citizen_reports').update({ status });
    if (reportId !== undefined && reportId !== null) return await query.eq('id', reportId).select().single();
    return await query.eq('reference_id', referenceId).select().single();
  }

  async updateTrainingStatus(table: 'bookings' | 'trainers', rowId: string | number, status: string, adminMessage?: string) {
    const payload: { status: string; admin_message?: string } = { status };
    if (adminMessage !== undefined) payload.admin_message = adminMessage;
    return await this.client.from(table).update(payload).eq('id', rowId).select().single();
  }

  async createTrainingMessage(message: TrainingMessage) {
    return await this.client.from('training_messages').insert([message]).select().single();
  }

  async uploadTrainingResource(file: File, resource: Pick<TrainingResource, 'title' | 'description' | 'resource_type'>) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const filePath = `${resource.resource_type}/${Date.now()}-${safeName}`;
    const uploadResult = await this.client.storage.from('training-assets').upload(filePath, file, { upsert: false });
    if (uploadResult.error) return { data: null, error: uploadResult.error };
    const { data: publicUrlData } = this.client.storage.from('training-assets').getPublicUrl(filePath);
    return await this.client.from('training_resources').insert([{ ...resource, file_name: safeName, file_url: publicUrlData.publicUrl }]).select().single();
  }
}
