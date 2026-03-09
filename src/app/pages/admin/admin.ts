import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class AdminComponent implements OnInit {
  dashboardData: any = {
    reports: [],
    bookings: [],
    trainers: [],
    phishingLogs: [],
    chatLogs: []
  };

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    // Aggregates all data from the updated SupabaseService
    this.dashboardData = await this.supabase.getAdminDashboardData();
  }

  downloadPDF(sectionName: string, data: any[]) {
    if (!data || data.length === 0) return;

    const doc = new jsPDF();
    doc.text(`SafeTech Official Report: ${sectionName}`, 14, 15);
    
    // Auto-generate table headers and rows
    const headers = Object.keys(data[0]);
    const rows = data.map(item => Object.values(item)) as RowInput[];

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [30, 106, 255] }, // SafeTech Blue
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`safetech_${sectionName.toLowerCase()}_report.pdf`);
  }
}