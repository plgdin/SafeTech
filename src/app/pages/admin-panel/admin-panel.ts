import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss'
})
export class AdminPanelComponent implements OnInit {
  /**
   * activeSection handles all the tables visible in your Supabase schema:
   * chat_logs, trainers, bookings, phishing_reports, scams, citizen_reports, phishing_db
   */
  activeSection: 'chats' | 'trainers' | 'bookings' | 'reports' | 'scams' | 'citizen' | 'database' = 'chats';
  isLoading = true;

  // This will store the data fetched from Supabase
  dataList: any[] = [];

  constructor() {}

  ngOnInit(): void {
    this.fetchData();
  }

  /**
   * Helper to safely format table headers from object keys.
   * Prevents TS2339 error by ensuring input is a string.
   */
  formatHeader(key: any): string {
    return String(key).replace(/_/g, ' ');
  }

  /**
   * Fetches data from Supabase based on the active section.
   * tableMap links the UI buttons to the actual SQL table names in your schema.
   */
  async fetchData() {
    this.isLoading = true;
    
    const tableMap = {
      'chats': 'chat_logs',
      'trainers': 'trainers',
      'bookings': 'bookings',
      'reports': 'phishing_reports',
      'scams': 'scams',               // Added from your schema
      'citizen': 'citizen_reports',   // Added from your schema
      'database': 'phishing_db'       // Added from your schema
    };

    const tableName = tableMap[this.activeSection];

    try {
      const response = await fetch(
        `${environment.supabaseUrl}/rest/v1/${tableName}?select=*&order=created_at.desc`, 
        {
          method: 'GET',
          headers: {
            'apikey': environment.supabaseKey,
            'Authorization': `Bearer ${environment.supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error(`Failed to fetch ${tableName}`);
      
      this.dataList = await response.json();
    } catch (error) {
      console.error("Supabase Fetch Error:", error);
      this.dataList = []; // Clear list on error
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Switches the visible table view and triggers a new fetch
   */
  setSection(section: 'chats' | 'trainers' | 'bookings' | 'reports' | 'scams' | 'citizen' | 'database') {
    this.activeSection = section;
    this.fetchData();
  }

  /**
   * Returns the data set currently being viewed
   */
  getCurrentData() {
    return this.dataList;
  }

  /**
   * Generates and downloads a PDF report using Supabase data
   */
  downloadPDF() {
    const doc: any = new jsPDF('l', 'mm', 'a4'); 
    const data = this.getCurrentData();
    
    if (!data || data.length === 0) {
      alert("No data available to export.");
      return;
    }

    // 1. Prepare Table Headers (Dynamically from keys)
    const headers = [Object.keys(data[0]).map(h => h.toUpperCase())];

    // 2. Prepare Table Body
    const body = data.map(row => Object.values(row)) as any[][];

    // 3. Set Document Header
    doc.setFontSize(20);
    doc.setTextColor(30, 106, 255); 
    doc.text(`SafeTech Systems: ${this.activeSection.toUpperCase()} Report`, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Records: ${data.length}`, 14, 27);

    // 4. Generate AutoTable
    autoTable(doc, {
      startY: 35,
      head: headers,
      body: body,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 106, 255], 
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 4, 
        overflow: 'linebreak',
        font: 'helvetica'
      },
      didDrawPage: (hookData) => {
        const totalPages = doc.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `SafeTech Confidential - Page ${totalPages}`, 
          pageWidth / 2, 
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    doc.save(`SafeTech_${this.activeSection}_Export_${Date.now()}.pdf`);
  }
}