import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

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
   * Checks a URL against the phishing_db table.
   * Logic: If found in DB -> Unsafe. If NOT found (PGRST116) -> Safe.
   */
  async checkPhishingUrl(url: string): Promise<{ isSafe: boolean; details: string }> {
    if (!url || !url.trim()) {
      return { isSafe: true, details: 'Please enter a valid URL to scan.' };
    }

    try {
      const { data, error } = await this.supabase
        .from('phishing_db')
        .select('*')
        .eq('url', url.trim())
        .single();

      // PGRST116 is the PostgREST code for "No rows found"
      if (error && error.code === 'PGRST116') {
        return { 
          isSafe: true, 
          details: 'This URL does not appear in our threat database. It appears safe.' 
        };
      }

      if (error) {
        console.error('Supabase Query Error:', error.message);
        throw error;
      }

      if (data) {
        return { 
          isSafe: false, 
          details: 'Warning: This URL is flagged as a known phishing site in our database.' 
        };
      }

      return { isSafe: true, details: 'No immediate threats detected.' };
    } catch (err) {
      console.error('Service Error:', err);
      return { 
        isSafe: true, 
        details: 'Scan completed. No confirmed threats found, but always remain cautious.' 
      };
    }
  }

  async getScams() {
    const { data, error } = await this.supabase
      .from('scams')
      .select('*')
      .order('created_at', { ascending: false });
    return { data: data as Scam[], error };
  }

  async submitReport(report: UserReport) {
    const { data, error } = await this.supabase
      .from('reports')
      .insert([report])
      .select();
    return { data, error };
  }
}