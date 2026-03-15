import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'safetech_admin_session';

  isLoggedIn() {
    return localStorage.getItem(this.storageKey) === 'active';
  }

  login(username: string, password: string) {
    const isValid =
      username.trim() === environment.adminUsername &&
      password === environment.adminPassword;

    if (isValid) {
      localStorage.setItem(this.storageKey, 'active');
    }

    return isValid;
  }

  logout() {
    localStorage.removeItem(this.storageKey);
  }
}
