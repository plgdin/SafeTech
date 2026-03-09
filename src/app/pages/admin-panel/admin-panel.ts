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
  activeSection: 'chats' | 'trainers' | 'bookings' = 'chats';
  isLoading = true;

  // Data arrays
  chats: any[] = [];
  trainers: any[] = [];
  bookings: any[] = [];

  constructor() {}

  ngOnInit(): void {
    this.fetchAdminData();
  }

  /**
   * Fetches all admin data from the Google Apps Script API
   */
  async fetchAdminData() {
    this.isLoading = true;
    try {
      const response = await fetch(`${environment.googleScriptUrl}?action=getAdminData`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const result = await response.json();
      
      // Ensure we always have an array even if the sheet is empty
      this.chats = result.chats || [];
      this.trainers = result.trainers || [];
      this.bookings = result.bookings || [];
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Switches the visible table view
   */
  setSection(section: 'chats' | 'trainers' | 'bookings') {
    this.activeSection = section;
  }

  /**
   * Returns the data set currently being viewed
   */
  getCurrentData() {
    if (this.activeSection === 'chats') return this.chats;
    if (this.activeSection === 'trainers') return this.trainers;
    return this.bookings;
  }

  /**
   * Generates and downloads a PDF report of the current table data
   */
  downloadPDF() {
    // We cast to 'any' to bypass strict TS checks on internal jsPDF properties
    const doc: any = new jsPDF('l', 'mm', 'a4'); 
    const data = this.getCurrentData();
    
    if (!data || data.length === 0) {
      alert("No data available to export.");
      return;
    }

    // 1. Prepare Table Headers (Keys from the first object)
    const headers = [Object.keys(data[0]).map(h => h.toUpperCase())];

    // 2. Prepare Table Body (Values from all objects)
    const body = data.map(row => Object.values(row)) as any[][];

    // 3. Set Document Header
    doc.setFontSize(20);
    doc.setTextColor(30, 106, 255); // SafeTech Blue
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
      columnStyles: {
        // Example: If the second column is too wide, we can set specific widths
        // 1: { cellWidth: 50 } 
      },
      didDrawPage: (hookData) => {
        // Footer: Page Numbering
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

    // 5. Save the file
    const fileName = `SafeTech_${this.activeSection}_${Date.now()}.pdf`;
    doc.save(fileName);
  }
}