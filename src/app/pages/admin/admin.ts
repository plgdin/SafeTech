import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import {
  AdminReport,
  SupabaseService,
  TrainerApplication,
  TrainingBooking,
  TrainingMessage,
  TrainingResource
} from '../../core/services/supabase';
import { AuthService } from '../../core/services/auth';

type ReportSortField = 'created_at' | 'status' | 'report_type' | 'reference_id';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class AdminComponent implements OnInit {
  isLoading = true;
  isSecondaryLoading = true;
  feedbackMessage = '';
  feedbackTone: 'success' | 'error' | 'info' = 'info';

  dashboardData: {
    reports: AdminReport[];
    bookings: TrainingBooking[];
    trainers: TrainerApplication[];
    phishingLogs: any[];
    chatLogs: any[];
    trainingMessages: TrainingMessage[];
    trainingResources: TrainingResource[];
  } = {
    reports: [],
    bookings: [],
    trainers: [],
    phishingLogs: [],
    chatLogs: [],
    trainingMessages: [],
    trainingResources: []
  };

  reportSortField: ReportSortField = 'created_at';
  reportSortDirection: SortDirection = 'desc';
  reportStatusFilter = 'all';
  reportSearch = '';

  reportStatuses = ['pending', 'under_audit', 'resolved', 'flagged'];
  trainingStatuses = ['pending', 'scheduled', 'in_review', 'approved', 'completed', 'cancelled'];

  reportStatusDrafts: Record<string, string> = {};
  bookingStatusDrafts: Record<string, string> = {};
  trainerStatusDrafts: Record<string, string> = {};
  bookingMessageDrafts: Record<string, string> = {};
  trainerMessageDrafts: Record<string, string> = {};

  messageForm = {
    audience: 'all-bookings',
    subject: '',
    message: ''
  };

  resourceForm: {
    title: string;
    description: string;
    resource_type: 'video' | 'notes';
    file: File | null;
  } = {
    title: '',
    description: '',
    resource_type: 'video',
    file: null
  };

  constructor(
    private supabase: SupabaseService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadDashboard();
  }

  async loadDashboard() {
    this.isLoading = true;
    this.isSecondaryLoading = true;
    this.clearFeedback();

    try {
      const primary = await this.supabase.getAdminDashboardPrimaryData();
      this.dashboardData = {
        ...this.dashboardData,
        reports: primary.reports,
        bookings: primary.bookings,
        trainers: primary.trainers
      };
      this.seedDrafts();
      this.isLoading = false;

      const secondary = await this.supabase.getAdminDashboardSecondaryData();
      this.dashboardData = {
        ...this.dashboardData,
        chatLogs: secondary.chatLogs,
        trainingMessages: secondary.trainingMessages,
        trainingResources: secondary.trainingResources
      };
    } catch (error) {
      console.error(error);
      this.setFeedback('Failed to load admin data.', 'error');
    } finally {
      this.isLoading = false;
      this.isSecondaryLoading = false;
    }
  }

  private seedDrafts() {
    for (const report of this.dashboardData.reports) {
      this.reportStatusDrafts[this.getRowKey(report)] = report.status || 'pending';
    }

    for (const booking of this.dashboardData.bookings) {
      const key = this.getRowKey(booking);
      this.bookingStatusDrafts[key] = booking.status || 'pending';
      this.bookingMessageDrafts[key] = booking.admin_message || '';
    }

    for (const trainer of this.dashboardData.trainers) {
      const key = this.getRowKey(trainer);
      this.trainerStatusDrafts[key] = trainer.status || 'pending';
      this.trainerMessageDrafts[key] = trainer.admin_message || '';
    }
  }

  get filteredReports() {
    const term = this.reportSearch.trim().toLowerCase();
    const sorted = [...this.dashboardData.reports].sort((a, b) =>
      this.compareValues(a[this.reportSortField], b[this.reportSortField], this.reportSortDirection)
    );

    return sorted.filter(report => {
      const matchesStatus =
        this.reportStatusFilter === 'all' || report.status === this.reportStatusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        report.reference_id,
        report.report_type,
        report.evidence_payload,
        report.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }

  private compareValues(a: unknown, b: unknown, direction: SortDirection) {
    const first = (a ?? '').toString().toLowerCase();
    const second = (b ?? '').toString().toLowerCase();
    const result = first.localeCompare(second, undefined, { numeric: true });
    return direction === 'asc' ? result : -result;
  }

  sortReports(field: ReportSortField) {
    if (this.reportSortField === field) {
      this.reportSortDirection = this.reportSortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.reportSortField = field;
    this.reportSortDirection = field === 'created_at' ? 'desc' : 'asc';
  }

  async updateReportStatus(report: AdminReport) {
    const nextStatus = this.reportStatusDrafts[this.getRowKey(report)];
    const { error } = await this.supabase.updateReportStatus(report.id, report.reference_id, nextStatus);

    if (error) {
      console.error(error);
      this.setFeedback('Unable to update report status.', 'error');
      return;
    }

    report.status = nextStatus;
    this.setFeedback(`Report ${report.reference_id || report.id} updated to ${nextStatus}.`, 'success');
  }

  setReportStatusDraft(report: AdminReport, status: string) {
    this.reportStatusDrafts[this.getRowKey(report)] = status;
  }

  setBookingStatusDraft(booking: TrainingBooking, status: string) {
    this.bookingStatusDrafts[this.getRowKey(booking)] = status;
  }

  setTrainerStatusDraft(trainer: TrainerApplication, status: string) {
    this.trainerStatusDrafts[this.getRowKey(trainer)] = status;
  }

  setBookingMessageDraft(booking: TrainingBooking, message: string) {
    this.bookingMessageDrafts[this.getRowKey(booking)] = message;
  }

  setTrainerMessageDraft(trainer: TrainerApplication, message: string) {
    this.trainerMessageDrafts[this.getRowKey(trainer)] = message;
  }

  async updateTrainingEntry(type: 'booking' | 'trainer', row: TrainingBooking | TrainerApplication) {
    const key = this.getRowKey(row);
    const table = type === 'booking' ? 'bookings' : 'trainers';
    const nextStatus = type === 'booking' ? this.bookingStatusDrafts[key] : this.trainerStatusDrafts[key];
    const adminMessage = type === 'booking' ? this.bookingMessageDrafts[key] : this.trainerMessageDrafts[key];

    if (!row.id) {
      this.setFeedback('This record is missing an id, so it cannot be updated.', 'error');
      return;
    }

    const { error } = await this.supabase.updateTrainingStatus(table, row.id, nextStatus, adminMessage);

    if (error) {
      console.error(error);
      this.setFeedback(`Unable to update ${type} entry.`, 'error');
      return;
    }

    row.status = nextStatus;
    row.admin_message = adminMessage;
    this.setFeedback(`${type === 'booking' ? 'Training booking' : 'Trainer application'} updated.`, 'success');
  }

  async sendTrainingMessage() {
    if (!this.messageForm.subject.trim() || !this.messageForm.message.trim()) {
      this.setFeedback('Enter both a subject and message before sending.', 'error');
      return;
    }

    const payload: TrainingMessage = {
      audience: this.messageForm.audience,
      subject: this.messageForm.subject.trim(),
      message: this.messageForm.message.trim()
    };

    const { data, error } = await this.supabase.createTrainingMessage(payload);

    if (error) {
      console.error(error);
      this.setFeedback('Unable to save training message.', 'error');
      return;
    }

    if (data) {
      this.dashboardData.trainingMessages = [data, ...this.dashboardData.trainingMessages];
    }

    this.messageForm = { audience: 'all-bookings', subject: '', message: '' };
    this.setFeedback('Training message saved successfully.', 'success');
  }

  onResourceSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.resourceForm.file = input.files?.[0] || null;
  }

  async uploadResource() {
    if (!this.resourceForm.title.trim() || !this.resourceForm.file) {
      this.setFeedback('Select a file and add a title before uploading.', 'error');
      return;
    }

    const { data, error } = await this.supabase.uploadTrainingResource(this.resourceForm.file, {
      title: this.resourceForm.title.trim(),
      description: this.resourceForm.description.trim(),
      resource_type: this.resourceForm.resource_type
    });

    if (error) {
      console.error(error);
      this.setFeedback('Upload failed. Check Supabase storage bucket and table permissions.', 'error');
      return;
    }

    if (data) {
      this.dashboardData.trainingResources = [data, ...this.dashboardData.trainingResources];
    }

    this.resourceForm = {
      title: '',
      description: '',
      resource_type: 'video',
      file: null
    };
    this.setFeedback('Training resource uploaded successfully.', 'success');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }

  downloadPDF(sectionName: string, data: any[]) {
    if (!data || data.length === 0) return;

    const doc = new jsPDF();
    doc.text(`SafeTech Official Report: ${sectionName}`, 14, 15);

    const headers = Object.keys(data[0]);
    const rows = data.map(item => Object.values(item)) as RowInput[];

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [30, 106, 255] },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`safetech_${sectionName.toLowerCase()}_report.pdf`);
  }

  getRowKey(row: { id?: string | number; reference_id?: string }) {
    return String(row.id ?? row.reference_id ?? 'unknown');
  }

  statusClass(status: string | undefined) {
    return `status-${(status || 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }

  private setFeedback(message: string, tone: 'success' | 'error' | 'info') {
    this.feedbackMessage = message;
    this.feedbackTone = tone;
  }

  private clearFeedback() {
    this.feedbackMessage = '';
    this.feedbackTone = 'info';
  }
}
