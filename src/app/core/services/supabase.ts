import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async getScams() {
    return await this.supabase.from('scams').select('*');
  }

  async submitReport(report: any) {
    return await this.supabase.from('reports').insert([report]);
  }
}