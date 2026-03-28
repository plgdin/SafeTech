import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './training.html',
  styleUrl: './training.scss'
})
export class TrainingComponent implements OnInit {
  showModal = false;
  activeTab: 'register' | 'book' = 'register';
  isSubmitting = false;
  showRegistrationSuccess = false;
  registeredUid = '';
  registrationEmailStatus = '';

  // Form 1: Become a Trainer
  applicationData = {
    name: '',
    age: null as number | null,
    location: '',
    education: '',
    email: '' // Added email to application data
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
  otpCode = '';

  educationLevels = ['10th Pass', '12th Pass / Diploma', 'Undergraduate / Degree', 'Post Graduate'];
  orgTypes = ['Institution', 'College', 'School', 'Office', 'Organization', 'Individual'];

  constructor(
    private cdr: ChangeDetectorRef,
    private supabase: SupabaseService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const requestedTab = this.route.snapshot.queryParamMap.get('tab');

    if (requestedTab === 'register' || requestedTab === 'book') {
      this.openForm(requestedTab);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
    }
  }

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
    }, 6000); // Increased time so user can copy the UID
  }

  // --- Date & Time Validation ---
  private validateSessionDateTime(dateStr: string, timeStr: string): { valid: boolean; error?: string } {
    if (!dateStr || !timeStr) return { valid: false, error: 'Select date and time' };

    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      return { valid: false, error: 'Bookings must be at least 48 hours in advance' };
    }

    const dayOfWeek = selectedDate.getDay(); 
    const dayOfMonth = selectedDate.getDate();

    if (dayOfWeek === 0) return { valid: false, error: 'Sundays are holidays' };
    if (dayOfWeek === 6 && dayOfMonth >= 8 && dayOfMonth <= 14) {
      return { valid: false, error: '2nd Saturdays are holidays' };
    }

    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startLimit = 10 * 60 + 15; 
    const endLimit = 14 * 60 + 15;  

    if (totalMinutes < startLimit || totalMinutes > endLimit) {
      return { valid: false, error: 'Slots available 10:15 - 14:15 (for 3hr session)' };
    }

    return { valid: true };
  }

  // --- UI Handlers ---
  openForm(tab: 'register' | 'book' = 'register') {
    this.showRegistrationSuccess = false;
    this.registeredUid = '';
    this.registrationEmailStatus = '';
    this.activeTab = tab;
    this.showModal = true;
  }

  closeForm() {
    this.showModal = false;
    this.resetForm();
  }

  onPhoneInput(value: string) {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 10 && !cleaned.startsWith('91')) {
      cleaned = '91' + cleaned.slice(-10);
    }
    cleaned = cleaned.substring(0, 12);
    let formatted = '';
    if (cleaned.length > 0) formatted = '+' + cleaned.substring(0, 2);
    if (cleaned.length > 2) formatted += ' ' + cleaned.substring(2, 7);
    if (cleaned.length > 7) formatted += ' ' + cleaned.substring(7, 12);
    this.phoneNumber = formatted;
  }

  confirmOTP() {}

  async submitData() {
    this.isSubmitting = true;

    try {
      if (this.activeTab === 'register') {
        if (!this.applicationData.email.trim()) {
          this.triggerToast("Enter an email address to receive your UID.", "error");
          this.isSubmitting = false;
          return;
        }

        const payload = {
          name: this.applicationData.name,
          age: this.applicationData.age,
          location: this.applicationData.location,
          education: this.applicationData.education,
          email: this.applicationData.email,
          phone: this.phoneNumber
        };

        const { error, generatedUid } = await this.supabase.registerTrainer(payload);

        if (error) throw error;
        if (!generatedUid) throw new Error('Trainer UID was not returned by Supabase.');

        this.registeredUid = generatedUid;
        this.showRegistrationSuccess = true;
        this.registrationEmailStatus = this.applicationData.email
          ? `A login copy has also been sent to ${this.applicationData.email}.`
          : 'No email address was provided, so please save this UID now.';
        this.triggerToast("Application submitted successfully.", "success");

        if (this.applicationData.email) {
          try {
            await this.supabase.sendRegistrationEmail(this.applicationData.email, generatedUid);
          } catch (emailError) {
            console.error(emailError);
            this.registrationEmailStatus = 'Application saved, but the email could not be sent. Please save this UID now.';
            this.triggerToast("UID email could not be sent. Save the UID shown on screen.", "info");
          }
        }

      } else {
        // Handle Booking
        const dateVal = this.validateSessionDateTime(this.bookingData.date, this.bookingData.startTime);
        if (!dateVal.valid) {
          this.triggerToast(dateVal.error!, "error");
          this.isSubmitting = false;
          return;
        }

        const payload = { 
          org_type: this.bookingData.orgType,
          address: this.bookingData.address,
          event_date: this.bookingData.date,
          event_time: this.bookingData.startTime,
          email: this.bookingData.email,
          mode: this.bookingData.mode,
          phone: this.phoneNumber 
        };

        const { error } = await this.supabase['client']
          .from('bookings')
          .insert([payload]);

        if (error) throw error;

        this.triggerToast("Training Session Booked!", "success");
        this.closeForm();
      }
    } catch (e) {
      console.error(e);
      this.triggerToast("Submission failed. Try again.", "error");
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  resetForm() {
    this.applicationData = { name: '', age: null, location: '', education: '', email: '' };
    this.bookingData = { orgType: '', address: '', date: '', startTime: '', email: '', mode: 'Online' };
    this.phoneNumber = '';
    this.otpCode = '';
    this.showRegistrationSuccess = false;
    this.registeredUid = '';
    this.registrationEmailStatus = '';
  }

  continueToTrainingLogin() {
    this.closeForm();
    this.router.navigate(['/training/login']);
  }
}
