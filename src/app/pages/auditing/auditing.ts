import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auditing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditing.html',
  styleUrl: './auditing.scss'
})
export class AuditingComponent {
  reportData = { incidentType: '', evidence: '' };
  
  isSubmitting = false;
  isTracking = false;
  copySuccess = false; 

  searchRefId: string = '';
  generatedRefId: string = ''; 
  currentStatus: string = '';
  currentStep: number = 0;

  // =========================================
  // OTP & PHONE VERIFICATION STATE
  // =========================================
  phoneNumber: string = '';
  otpCode: string = '';
  generatedOtp: string = ''; // Stores the real random OTP
  otpSent: boolean = false;
  isVerifying: boolean = false;
  isPhoneVerified: boolean = false;

  // =========================================
  // CUSTOM DROPDOWN LOGIC
  // =========================================
  isDropdownOpen = false;
  
  categories = [
    { id: 'phishing', label: 'Phishing / Malicious Link' },
    { id: 'otp_fraud', label: 'OTP / WhatsApp Fraud' },
    { id: 'financial', label: 'Financial / UPI Fraud' },
    { id: 'investment', label: 'Investment / Crypto Scam' },
    { id: 'shopping', label: 'Fake Online Shopping Page' },
    { id: 'job_scam', label: 'Employment / Job Scam' },
    { id: 'identity_theft', label: 'Identity Theft / Impersonation' },
    { id: 'cyberbullying', label: 'Cyberbullying / Harassment' },
    { id: 'ransomware', label: 'Ransomware / Malware' },
    { id: 'sextortion', label: 'Sextortion / Blackmail' },
    { id: 'other', label: 'Other (Specify in evidence)' }
  ];

  constructor(
    private supabase: SupabaseService, 
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // --- WATI WhatsApp OTP Logic ---
  async requestOTP() {
    // 1. Clean the phone number (WATI needs numbers only, e.g., 919876543210)
    const cleanPhone = this.phoneNumber.replace(/[^0-9]/g, '');

    if (cleanPhone.length < 10) {
      alert("Please enter a valid WhatsApp number with country code (e.g., 919876543210).");
      return;
    }
    
    this.isVerifying = true;
    this.cdr.detectChanges();

    // 2. Generate a real 6-digit random code
    this.generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 3. Format the WhatsApp Message
    const message = `🚨 *SafeTech Guardian* 🚨\n\nYour secure reporting verification code is: *${this.generatedOtp}*\n\nPlease enter this code on the website. Do not share it with anyone.`;

    try {
      // 4. Send the request to WATI
      const watiUrl = `${environment.watiEndpoint}/api/v1/sendSessionMessage/${cleanPhone}?messageText=${encodeURIComponent(message)}`;
      
      const response = await fetch(watiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environment.watiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('WATI Error details:', errorData);
        throw new Error('Failed to send WhatsApp message via WATI');
      }

      this.otpSent = true;
    } catch (error) {
      console.error(error);
      alert("Failed to send WhatsApp message. Ensure the number includes the country code (like 91) and try again.");
    } finally {
      this.isVerifying = false;
      this.cdr.detectChanges();
    }
  }

  async confirmOTP() {
    if (!this.otpCode) return;
    this.isVerifying = true;
    this.cdr.detectChanges();

    // Check if what the user typed matches our generated code
    setTimeout(() => {
      if (this.otpCode === this.generatedOtp) {
        this.isPhoneVerified = true;
        this.otpSent = false;
      } else {
        alert("Invalid OTP Code. Please check your WhatsApp and try again.");
      }
      this.isVerifying = false;
      this.cdr.detectChanges();
    }, 800); // Small fake delay to make the UI feel secure
  }

  resetPhone() {
    this.isPhoneVerified = false;
    this.otpSent = false;
    this.otpCode = '';
    this.generatedOtp = '';
    this.cdr.detectChanges();
  }

  // --- Dropdown Logic ---
  getSelectedCategoryLabel() {
    const selected = this.categories.find(c => c.id === this.reportData.incidentType);
    return selected ? selected.label : 'Select Incident Type...';
  }

  selectCategory(categoryId: string) {
    this.reportData.incidentType = categoryId;
    this.isDropdownOpen = false;
    this.cdr.detectChanges(); 
  }

  // --- Submission Logic ---
  async submitForensicAudit() {
    if (!this.reportData.evidence.trim() || !this.reportData.incidentType || !this.isPhoneVerified || this.isSubmitting) return;
    
    this.isSubmitting = true;
    this.generatedRefId = ''; 
    this.cdr.detectChanges(); 

    const refId = `SF-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

    try {
      const { error } = await this.supabase.submitReport({
        report_type: this.reportData.incidentType,
        content: `[Verified Reporter Phone: ${this.phoneNumber}]\n\n${this.reportData.evidence}`,
        status: 'pending',
        reference_id: refId 
      });

      if (!error) {
        this.zone.run(() => {
          this.generatedRefId = refId;
          this.reportData.evidence = ''; 
          this.reportData.incidentType = ''; 
          this.resetPhone(); 
          this.cdr.detectChanges();
        });
        alert(`REPORT SECURED.\nReference ID: ${refId}`);
      }
    } catch (err) {
      alert('SYSTEM ERROR: Handshake failed.');
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges(); 
    }
  }

  // --- Utility & Tracking ---
  async copyToClipboard(id: string) {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      this.copySuccess = true;
      this.cdr.detectChanges();
      setTimeout(() => { this.copySuccess = false; this.cdr.detectChanges(); }, 3000);
    } catch (err) {}
  }

  async trackReport() {
    if (!this.searchRefId.trim() || this.isTracking) return;
    this.isTracking = true;
    this.currentStep = 0; 
    this.currentStatus = '';
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabase.getReportStatus(this.searchRefId);
      this.zone.run(() => {
        if (data) {
          this.currentStatus = data.status;
          if (data.status === 'pending') this.currentStep = 1;
          else if (data.status === 'under_audit') this.currentStep = 2;
          else if (data.status === 'resolved') this.currentStep = 3;
          this.cdr.detectChanges(); 
        } else {
          alert('No record found for this Reference ID.');
          this.currentStep = 0;
        }
      });
    } catch (err) {
      alert('TRACKING FAILED: Unable to reach secure forensic servers.');
    } finally {
      this.isTracking = false;
      this.cdr.detectChanges();
    }
  }
}