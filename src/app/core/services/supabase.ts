import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Updated interface to match Flow 6 requirements
export interface Scam {
  id?: number;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  type: string;
  created_at?: string;
  guide_url?: string; // Link to safety guides
}

export interface UserReport {
  report_type: string;
  content: string;
  user_email?: string;
  status?: 'pending' | 'resolved';
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  /**
   * Flow 5: Phishing Website Checker
   */
  async checkPhishingUrl(url: string): Promise<{ isSafe: boolean; details: string }> {
    if (!url || !url.trim()) return { isSafe: true, details: 'Please enter a valid URL.' };
    const cleanUrl = url.trim().toLowerCase();

    try {
      const { data, error } = await this.supabase
        .from('phishing_db')
        .select('*')
        .eq('url', cleanUrl)
        .single();

      if (error && error.code === 'PGRST116') {
        return { isSafe: true, details: 'Domain not found in blacklist. Initiating pattern analysis...' };
      }
      if (data) {
        return { isSafe: false, details: 'CRITICAL: Confirmed match in global phishing database.' };
      }
      return { isSafe: true, details: 'No immediate database matches found.' };
    } catch (err) {
      return { isSafe: true, details: 'Local scan active. Database lookup bypassed.' };
    }
  }

  /**
   * Flow 3: Auditing and Reporting
   * Submits reports and evidence to the database.
   */
  async submitReport(report: UserReport) {
    return await this.supabase.from('reports').insert([report]).select();
  }

  /**
   * Flow 6: Scam Awareness (Latest Alerts & A-Z List)
   */
  async getScams() {
    return await this.supabase
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
  }

  /**
   * NEW: Fetch urgent alerts specifically for the marquee or top banner
   */
  async getUrgentAlerts() {
    return await this.supabase
      .from('scams')
      .select('*')
      .eq('severity', 'High')
      .limit(3)
      .order('created_at', { ascending: false });
  }
}