import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Logic for Admin login to the Safe Tech portal
  isLoggedIn() {
    return true; 
  }
}