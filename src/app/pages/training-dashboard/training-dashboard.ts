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

  // CMS Form State
  newResource = {
    title: '',
    description: '',
    type: 'notes' as 'video' | 'notes',
    file: null as File | null
  };

  constructor(
    private auth: AuthService,
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.trainerData = this.auth.getTrainerData();
    
    if (!this.trainerData) {
      this.router.navigate(['/training/login']);
      return;
    }

    await this.loadContent();
  }

  async loadContent() {
    this.isLoading = true;
    try {
      // Fetch messages targeted to this trainer's UID or 'all-trainers'
      const { data: msgData } = await this.supabase['client']
        .from('training_messages')
        .select('*')
        .or(`audience.eq.all-trainers,target_id.eq.${this.trainerData.id}`)
        .order('created_at', { ascending: false });

      // Fetch resources uploaded by this trainer
      const { data: resData } = await this.supabase['client']
        .from('training_resources')
        .select('*')
        .eq('uploader_id', this.trainerData.id)
        .order('created_at', { ascending: false });

      this.messages = msgData || [];
      this.resources = resData || [];
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  onFileSelected(event: any) {
    this.newResource.file = event.target.files[0];
  }

  async handleUpload() {
    if (!this.newResource.file || !this.newResource.title) return;

    const { data, error } = await this.supabase.uploadTrainingResource(
      this.newResource.file,
      {
        title: this.newResource.title,
        description: this.newResource.description,
        resource_type: this.newResource.type
      }
    );

    if (data) {
      // Logic to link uploader_id if table supports it
      this.resources.unshift(data);
      this.resetForm();
    }
  }

  resetForm() {
    this.newResource = { title: '', description: '', type: 'notes', file: null };
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/home']);
  }
}