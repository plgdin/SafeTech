import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { SupabaseService, TrainingMessage, TrainingResource } from '../../core/services/supabase';

@Component({
  selector: 'app-training-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './training-dashboard.html',
  styleUrl: './training-dashboard.scss'
})
export class TrainingDashboardComponent implements OnInit {
  trainerData: any;
  messages: TrainingMessage[] = [];
  resources: TrainingResource[] = [];
  isLoading = true;

  constructor(
    private auth: AuthService,
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Retrieves the ST-XXXXXX data from local storage
    this.trainerData = this.auth.getTrainerData();
    
    if (!this.trainerData) {
      this.router.navigate(['/training/login']);
      return;
    }

    await this.loadTrainerContent();
  }

  async loadTrainerContent() {
    this.isLoading = true;
    try {
      // Fetch notifications sent by Admin to this specific UID
      const { data: msgData } = await this.supabase['client']
        .from('training_messages')
        .select('*')
        .or(`audience.eq.all-trainers,target_id.eq.${this.trainerData.id}`)
        .order('created_at', { ascending: false });

      // Fetch resources linked to this trainer
      const { data: resData } = await this.supabase['client']
        .from('training_resources')
        .select('*')
        .eq('file_name', this.trainerData.id) 
        .order('created_at', { ascending: false });

      this.messages = msgData || [];
      this.resources = resData || [];
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/home']);
  }
}