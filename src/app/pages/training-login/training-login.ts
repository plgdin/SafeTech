import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-training-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './training-login.html',
  styleUrl: './training-login.scss'
})
export class TrainingLoginComponent {
  uid: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async handleLogin() {
    if (!this.uid.trim()) {
      this.errorMessage = 'Please enter your Unique ID.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Attempts login for both general Users and Trainers
      const isTrainer = await this.auth.trainerLogin(this.uid.trim());
      const isUser = !isTrainer ? await this.auth.userLogin(this.uid.trim()) : false;

      if (isTrainer || isUser) {
        this.router.navigate(['/training/dashboard']);
      } else {
        this.errorMessage = 'Invalid UID. Please check your credentials.';
      }
    } catch (error) {
      this.errorMessage = 'An error occurred during login. Please try again.';
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
