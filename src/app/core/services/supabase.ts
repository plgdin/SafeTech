import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Define strict interfaces to pass security audits
export interface Scam {
  id?: number;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  type: string;
  created_at?: string;
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
   * Fetches all scams from the 'scams' table
   */
  async getScams() {
    const { data, error } = await this.supabase
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getScams error:', error.message);
      return { data: null, error };
    }
    return { data: data as Scam[], error: null };
  }

  /**
   * Submits a new report to the 'reports' table
   */
  async submitReport(report: UserReport) {
    const { data, error } = await this.supabase
      .from('reports')
      .insert([report])
      .select();

    if (error) {
      console.error('Supabase submitReport error:', error.message);
      return { data: null, error };
    }
    return { data, error: null };
  }
}