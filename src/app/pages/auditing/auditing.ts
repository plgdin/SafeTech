import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase';
import { environment } from '../../../environments/environment';
import { showToast } from '../../core/utils/toast';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-auditing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  generatedOtp: string = ''; 
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

  // --- Real-time Phone Auto-Formatter ---
  onPhoneInput(value: string) {
    if (!value) {
      this.phoneNumber = '';
      return;
    }
    let cleaned = value.replace(/\D/g, '');
    
    // Auto-adds 91 if exactly 10 digits are entered
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }
    
    cleaned = cleaned.substring(0, 12);
    
    let formatted = '';
    if (cleaned.length > 0) formatted = '+' + cleaned.substring(0, 2);
    if (cleaned.length > 2) formatted += ' ' + cleaned.substring(2, 7);
    if (cleaned.length > 7) formatted += ' ' + cleaned.substring(7, 12);
    
    this.phoneNumber = formatted;
  }

  // --- OTP Logic via Secure Proxy (Bypasses CORS) ---
  async requestOTP() {
    const cleanPhone = this.phoneNumber.replace(/[^0-9]/g, '');

    if (cleanPhone.length < 10) {
      showToast("Please enter a valid WhatsApp number.");
      return;
    }
    
    this.isVerifying = true;
    this.cdr.detectChanges();

    // 1. Generate the 6-digit OTP
    this.generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    /**
     * PROXY URL: Replace this with your Google Apps Script URL 
     * or your Supabase Edge Function URL.
     */
    const proxyUrl = environment.googleScriptUrl;

    try {
      // 2. Call the proxy (which handles the Vonage API call server-side)
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // Use text/plain to avoid preflight CORS issues with some proxies
        },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: this.generatedOtp
        })
      });

      // 3. Handle success
      this.otpSent = true;
      console.log("OTP Sent Successfully via Proxy!");
      
    } catch (error: any) {
      console.error('OTP Request Failed:', error);
      showToast("Verification system error. Please ensure your proxy is deployed.");
    } finally {
      this.isVerifying = false;
      this.cdr.detectChanges();
    }
  }

  async confirmOTP() {
    if (!this.otpCode) return;
    this.isVerifying = true;
    this.cdr.detectChanges();

    // Artificial delay for UX
    setTimeout(() => {
      if (this.otpCode === this.generatedOtp) {
        this.isPhoneVerified = true;
        this.otpSent = false;
        showToast("Phone Verified Successfully.");
      } else {
        showToast("Invalid OTP Code. Please check your WhatsApp.");
      }
      this.isVerifying = false;
      this.cdr.detectChanges();
    }, 1000); 
  }

  resetPhone() {
    this.isPhoneVerified = false;
    this.otpSent = false;
    this.otpCode = '';
    this.generatedOtp = '';
    this.phoneNumber = ''; 
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
          // We don't reset phone here automatically in case they need to submit another
          this.cdr.detectChanges();
        });
        showToast(`REPORT SECURED.\nReference ID: ${refId}`);
      }
    } catch (err) {
      showToast('SYSTEM ERROR: Handshake failed.');
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
          showToast('No record found for this Reference ID.');
          this.currentStep = 0;
        }
      });
    } catch (err) {
      showToast('TRACKING FAILED: Unable to reach secure forensic servers.');
    } finally {
      this.isTracking = false;
      this.cdr.detectChanges();
    }
  }
}