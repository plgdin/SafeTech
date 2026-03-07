import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { SupabaseService, Scam } from '../../core/services/supabase';

@Component({
  selector: 'app-scam-awareness',
  templateUrl: './scam-awareness.html',
  styleUrl: './scam-awareness.scss',
  standalone: true,
  imports: [CommonModule, RouterModule] 
})
export class ScamAwarenessComponent implements OnInit {
  scams: Scam[] = [];
  urgentScams: Scam[] = []; // Dedicated array for High/Medium threats

  constructor(
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  async ngOnInit() {
    const { data, error } = await this.supabase.getScams();
    
    this.zone.run(() => {
      if (data) {
        // Map and normalize the database columns
        this.scams = data.map((item: any) => {
          // Normalize string to capitalized (e.g., 'high' -> 'High') to fix ngIf issues
          const rawSeverity = item.risk_level || item.severity || 'Medium';
          const normalizedSeverity = rawSeverity.charAt(0).toUpperCase() + rawSeverity.slice(1).toLowerCase();

          return {
            ...item,
            type: item.category || item.type || 'General',
            severity: normalizedSeverity
          };
        });

        // Filter urgent threats out so the template doesn't have to do it
        this.urgentScams = this.scams.filter(s => s.severity === 'High' || s.severity === 'Medium');
        
        // Force the view to update immediately
        this.cdr.detectChanges();
      } else {
        console.error('Error fetching scams:', error);
        this.scams = [];
        this.urgentScams = [];
      }
    });
  }
}