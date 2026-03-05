import { Component, ChangeDetectorRef, NgZone } from '@angular/core'; // Added NgZone
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-auditing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auditing.html',
  styleUrl: './auditing.scss'
})
export class AuditingComponent {
  reportData = { incidentType: 'Phishing Website', evidence: '' };
  
  isSubmitting = false;
  isTracking = false;
  copySuccess = false; 

  searchRefId: string = '';
  generatedRefId: string = ''; 
  currentStatus: string = '';
  currentStep: number = 0;

  constructor(
    private supabase: SupabaseService, 
    private cdr: ChangeDetectorRef,
    private zone: NgZone // Inject NgZone
  ) {}

  async submitForensicAudit() {
    if (!this.reportData.evidence.trim() || this.isSubmitting) return;
    this.isSubmitting = true;
    this.generatedRefId = ''; 
    this.cdr.detectChanges(); 

    const refId = `SF-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

    try {
      const { error } = await this.supabase.submitReport({
        report_type: this.reportData.incidentType,
        content: this.reportData.evidence,
        status: 'pending',
        reference_id: refId 
      });

      if (!error) {
        // Use zone.run to ensure the success card appears immediately
        this.zone.run(() => {
          this.generatedRefId = refId;
          this.reportData.evidence = ''; 
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

  async copyToClipboard(id: string) {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      this.copySuccess = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copySuccess = false;
        this.cdr.detectChanges();
      }, 3000);
    } catch (err) {
      console.error('Clipboard access denied');
    }
  }

  async trackReport() {
    if (!this.searchRefId.trim() || this.isTracking) return;

    this.isTracking = true;
    this.currentStep = 0; 
    this.currentStatus = '';
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabase.getReportStatus(this.searchRefId);

      // Force this update into the Angular Zone to fix the "backspace required" bug
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