import { Component, OnInit } from '@angular/core';
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

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    const { data } = await this.supabase.getScams();
    this.scams = data || [];
  }

  /**
   * CYBERY SCHEME: Optimized for #020202 and #1e6aff palette.
   * Matches the strategic card layouts from the template source.
   */
  getSeverityClasses(severity: string): string {
    // base uses the exact border token #ebebeb and the thick side-border style
    const base = 'border border-[#ebebeb] border-l-[8px] transition-all duration-500 ';
    
    switch (severity) {
      case 'High': 
        return base + 'border-l-[#ef4444] hover:border-[#ef4444]/30 shadow-[0_10px_30px_rgba(239,68,68,0.05)]';
      case 'Medium': 
        return base + 'border-l-[#f59e0b] hover:border-[#f59e0b]/30 shadow-[0_10px_30px_rgba(245,158,11,0.05)]';
      case 'Low': 
        return base + 'border-l-[#10b981] hover:border-[#10b981]/30 shadow-[0_10px_30px_rgba(16,185,129,0.05)]';
      default: 
        // Default uses the primary #1e6aff Blue for a clean look
        return base + 'border-l-[#1e6aff] hover:border-[#1e6aff]/30 shadow-[0_10px_30px_rgba(30,106,255,0.05)]';
    }
  }
}