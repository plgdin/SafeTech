import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-scam-awareness',
  templateUrl: './scam-awareness.html',
  styleUrl: './scam-awareness.scss',
  standalone: false
})
export class ScamAwarenessComponent implements OnInit {
  scams: any[] = [];

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    const { data } = await this.supabase.getScams();
    this.scams = data || [];
  }
}