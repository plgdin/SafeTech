import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Storage keys for session persistence
  private readonly adminKey = 'safetech_admin_session';
  private readonly userKey = 'safetech_user_data';
  private readonly trainerKey = 'safetech_trainer_data';

  constructor(private supabase: SupabaseService) {}

  // ─── ADMIN AUTHENTICATION (ENVIRONMENT-BASED) ────────────────────────────

  isAdminLoggedIn(): boolean {
    return localStorage.getItem(this.adminKey) === 'active';
  }

  /**
   * Verified Admin login using credentials from the environment file.
   */
  adminLogin(username: string, password: string): boolean {
    const isValid =
      username.trim() === environment.adminUsername &&
      password === environment.adminPassword;

    if (isValid) {
      localStorage.setItem(this.adminKey, 'active');
    }
    return isValid;
  }

  // ─── TRAINER AUTHENTICATION (UID-BASED) ──────────────────────────────────

  async trainerLogin(uid: string): Promise<boolean> {
    const { data, error } = await this.supabase.getTrainerByUid(uid);
    
    if (data && !error) {
      localStorage.setItem(this.trainerKey, JSON.stringify(data));
      return true;
    }
    return false;
  }

  isTrainerLoggedIn(): boolean {
    return !!localStorage.getItem(this.trainerKey);
  }

  getTrainerData() {
    const data = localStorage.getItem(this.trainerKey);
    return data ? JSON.parse(data) : null;
  }

  // ─── USER MANAGEMENT (UMS LOGIN) ─────────────────────────────────────────

  async userLogin(uid: string): Promise<boolean> {
    const { data, error } = await this.supabase.getTrainerByUid(uid); 
    
    if (data && !error) {
      localStorage.setItem(this.userKey, JSON.stringify(data));
      return true;
    }
    return false;
  }

  isUserLoggedIn(): boolean {
    return !!localStorage.getItem(this.userKey);
  }

  getUserData() {
    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  // ─── REGISTRATION & SETUP ────────────────────────────────────────────────

  async register(email: string) {
    return await this.supabase.sendSetupEmail(email);
  }

  // ─── GLOBAL LOGOUT ───────────────────────────────────────────────────────

  logout() {
    localStorage.removeItem(this.adminKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.trainerKey);
  }
}