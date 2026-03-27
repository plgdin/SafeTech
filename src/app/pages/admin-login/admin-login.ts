import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss'
})
export class AdminLoginComponent {
  username = '';
  password = '';
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  submit() {
    this.error = '';

    if (!this.username.trim() || !this.password) {
      this.error = 'Enter your admin username and password.';
      return;
    }

    // UPDATE: Changed .login() to .adminLogin() to match the new AuthService
    if (!this.authService.adminLogin(this.username, this.password)) {
      this.error = 'Invalid admin credentials.';
      return;
    }

    this.router.navigate(['/admin']);
  }
}