import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './training.html',
  styleUrl: './training.scss'
})
export class TrainingComponent {
  showModal = false;
  activeTab: 'register' | 'book' = 'register';
  isSubmitting = false;
  isVerifying = false;
  otpSent = false;
  isPhoneVerified = false;

  // Form 1: Become a Trainer
  applicationData = {
    name: '',
    age: null as number | null,
    location: '',
    education: ''
  };

  // Form 2: Book a Session
  bookingData = {
    orgType: '',
    address: '',
    date: '',
    startTime: '',
    email: '',
    mode: 'Online' 
  };

  phoneNumber: string = '';
  otpCode: string = '';
  generatedOtp: string = '';

  educationLevels = ['10th Pass', '12th Pass / Diploma', 'Undergraduate / Degree', 'Post Graduate'];
  orgTypes = ['Institution', 'College', 'School', 'Office', 'Organization', 'Individual'];

  constructor(private cdr: ChangeDetectorRef) {}

  // --- Utility: Toast System ---
  private triggerToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const oldContainer = document.getElementById('global-toast-container');
    if (oldContainer) oldContainer.remove();

    const container = document.createElement('div');
    container.id = 'global-toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

    toast.innerHTML = `
      <span>${icon}</span>
      <div class="toast-content">
        <div class="toast-label">${type.toUpperCase()}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => container.remove(), 400);
    }, 4000);
  }

  // --- Date & Time Validation ---
  private validateSessionDateTime(dateStr: string, timeStr: string): { valid: boolean; error?: string } {
    if (!dateStr || !timeStr) return { valid: false, error: 'Select date and time' };

    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Block Past Dates & Same Day
    if (selectedDate <= today) {
      return { valid: false, error: 'Bookings must be at least 48 hours in advance' };
    }

    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    const dayOfMonth = selectedDate.getDate();

    // 2. Check Sunday
    if (dayOfWeek === 0) return { valid: false, error: 'Sundays are holidays' };

    // 3. Check 2nd Saturday (falls between 8th and 14th)
    if (dayOfWeek === 6 && dayOfMonth >= 8 && dayOfMonth <= 14) {
      return { valid: false, error: '2nd Saturdays are holidays' };
    }

    // 4. Check Time (10:15 to 17:15)
    // Since session is 3 hours, latest start time is 14:15
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startLimit = 10 * 60 + 15; // 10:15
    const endLimit = 14 * 60 + 15;  // 14:15 (to end by 17:15)

    if (totalMinutes < startLimit || totalMinutes > endLimit) {
      return { valid: false, error: 'Slots available 10:15 - 14:15 (for 3hr session)' };
    }

    return { valid: true };
  }

  // --- UI Handlers ---
  openForm(tab: 'register' | 'book' = 'register') {
    this.activeTab = tab;
    this.showModal = true;
  }

  closeForm() {
    this.showModal = false;
    this.resetForm();
  }

  onPhoneInput(value: string) {
    let cleaned = value.replace(/\D/g, '');
    
    // Ensure 91 prefix
    if (cleaned.length >= 10 && !cleaned.startsWith('91')) {
      cleaned = '91' + cleaned.slice(-10);
    }
    
    cleaned = cleaned.substring(0, 12);
    
    // Formatting: +XX XXXXX XXXXX
    let formatted = '';
    if (cleaned.length > 0) formatted = '+' + cleaned.substring(0, 2);
    if (cleaned.length > 2) formatted += ' ' + cleaned.substring(2, 7);
    if (cleaned.length > 7) formatted += ' ' + cleaned.substring(7, 12);
    
    this.phoneNumber = formatted;
  }

  async requestOTP() {
    const cleanPhone = this.phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 12) {
      this.triggerToast("Enter a valid 10-digit WhatsApp number", "error");
      return;
    }

    this.isVerifying = true;
    this.generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      this.otpSent = true; 
      this.cdr.detectChanges();

      const response = await fetch(environment.googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'sendOtp',
          phone: cleanPhone,
          otp: this.generatedOtp
        })
      });

      this.triggerToast("OTP sent to WhatsApp", "success");
    } catch (error) {
      this.triggerToast("Failed to send OTP", "error");
      this.otpSent = false;
    } finally {
      this.isVerifying = false;
      this.cdr.detectChanges();
    }
  }

  confirmOTP() {
    if (this.otpCode === this.generatedOtp && this.otpCode !== '') {
      this.isPhoneVerified = true;
      this.otpSent = false;
      this.triggerToast("Phone Verified", "success");
    } else {
      this.triggerToast("Invalid OTP", "error");
    }
    this.cdr.detectChanges();
  }

  async submitData() {
    // 1. Phone Verification Check
    if (!this.isPhoneVerified) {
      this.triggerToast("Please verify phone first", "error");
      return;
    }

    // 2. Tab-Specific Validation
    if (this.activeTab === 'book') {
      const dateVal = this.validateSessionDateTime(this.bookingData.date, this.bookingData.startTime);
      if (!dateVal.valid) {
        this.triggerToast(dateVal.error!, "error");
        return;
      }
      if (!this.bookingData.orgType || !this.bookingData.email || !this.bookingData.address) {
        this.triggerToast("Please fill all booking details", "error");
        return;
      }
    } else {
      if (!this.applicationData.name || !this.applicationData.education) {
        this.triggerToast("Please fill all required fields", "error");
        return;
      }
    }

    this.isSubmitting = true;
    
    const payload = {
      action: this.activeTab === 'register' ? 'saveTrainer' : 'saveBooking',
      phone: this.phoneNumber,
      ...(this.activeTab === 'register' ? this.applicationData : this.bookingData),
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(environment.googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      this.triggerToast(
        this.activeTab === 'register' ? "Application Submitted Successfully!" : "Training Session Booked!", 
        "success"
      );
      this.closeForm();
    } catch (e) {
      this.triggerToast("Submission failed. Try again.", "error");
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  resetForm() {
    this.applicationData = { name: '', age: null, location: '', education: '' };
    this.bookingData = { orgType: '', address: '', date: '', startTime: '', email: '', mode: 'Online' };
    this.phoneNumber = '';
    this.isPhoneVerified = false;
    this.otpSent = false;
    this.otpCode = '';
    this.generatedOtp = '';
  }
}