import { Component } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-auditing',
  templateUrl: './auditing.html',
  styleUrl: './auditing.scss',
  standalone: false
})
export class AuditingComponent {
  constructor(private supabase: SupabaseService) {}

  async onSubmitReport(formData: any) {
    const { data, error } = await this.supabase.submitReport(formData);
    if (error) alert('Error submitting report');
    else alert('Report submitted successfully!');
  }
}