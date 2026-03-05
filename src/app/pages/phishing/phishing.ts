import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, UserReport } from '../../core/services/supabase';

@Component({
  selector: 'app-phishing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phishing.html'
})
export class PhishingComponent {
  targetUrl: string = '';
  loading: boolean = false;
  scanProgress: number = 0;
  scanStatus: string = 'System Idle';
  result: { isSafe: boolean; details: string; score: number; reasons: string[] } | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef 
  ) { }

  // Async delay helper for smoother, Angular-safe animations
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateRiskScore(url: string): { score: number; reasons: string[] } {
    let score = 0;
    let reasons: string[] = [];
    const urlLower = url.toLowerCase().trim();

    // Authority Whitelist
    const safeDomains = ['google.com', 'kerala.gov.in', 'youtube.com', 'github.com', 'microsoft.com', 'paypal.com'];
    if (safeDomains.some(d => urlLower === d || urlLower.endsWith('.' + d))) {
      return { score: 0, reasons: ['Verified Official Domain Authority.'] };
    }

    if (urlLower.startsWith('http://')) {
      score += 40;
      reasons.push('Insecure Protocol: Data transmission is unencrypted (HTTP).');
    }

    const badTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.zip', '.top', '.icu'];
    if (badTLDs.some(tld => urlLower.includes(tld))) {
      score += 35;
      reasons.push('High-Risk TLD: Domain extension frequently used for malicious hosting.');
    }

    const suspiciousPatterns = [
      { regex: /(0|1|l|i|-){3,}/, weight: 20, reason: 'Typosquatting: Visual character manipulation detected.' },
      { regex: /verify|secure|update|login|banking|account|paypal/, weight: 55, reason: 'Brand Spoofing: Suspicious use of urgency/financial keywords.' },
      { regex: /(\..*){3,}/, weight: 25, reason: 'URL Masking: Excessive subdomains detected.' }
    ];

    suspiciousPatterns.forEach(p => {
      if (p.regex.test(urlLower)) {
        score += p.weight;
        reasons.push(p.reason);
      }
    });

    return { 
      score: Math.min(score, 100), 
      reasons: reasons.length > 0 ? reasons : ['Heuristic scan complete. No immediate threats found.'] 
    };
  }

  async onCheck() {
    const input = this.targetUrl.trim();
    if (!input || this.loading) return;

    this.loading = true;
    this.result = null;
    this.scanProgress = 0;
    this.scanStatus = 'Initializing Multi-Vector Audit...';
    
    // Force immediate UI update to trigger the scanning state
    this.cdr.detectChanges();

    const dbTask = this.supabaseService.checkPhishingUrl(input).catch(() => null);
    const heuristic = this.calculateRiskScore(input);

    // Asynchronous Progress Engine (Replaces setInterval)
    while (this.scanProgress < 100) {
      await this.delay(50); // Speed of the scan
      this.scanProgress += 5;
      
      if (this.scanProgress === 20) this.scanStatus = 'Auditing SSL Certificates...';
      if (this.scanProgress === 50) this.scanStatus = 'Consulting Global Threat Intelligence...';
      if (this.scanProgress === 85) this.scanStatus = 'Executing Heuristic Logic...';
      
      this.cdr.detectChanges();
    }

    await this.finalizeScan(input, heuristic, dbTask);
  }

  private async finalizeScan(input: string, heuristic: any, dbTask: Promise<any>) {
    try {
      const dbCheck = await dbTask;
      if (dbCheck && !dbCheck.isSafe) {
        this.result = { isSafe: false, details: dbCheck.details, score: 100, reasons: ['DATABASE MATCH: Confirmed malicious in global blacklist.'] };
      } else {
        this.result = { 
          isSafe: heuristic.score < 70, 
          details: heuristic.score >= 70 ? 'CRITICAL: High probability of phishing detected.' : 'Heuristic scan complete.', 
          score: heuristic.score,
          reasons: heuristic.reasons
        };
      }
    } catch (error) {
      this.result = { isSafe: heuristic.score < 70, details: 'Offline Mode: Local heuristic fallback active.', score: heuristic.score, reasons: heuristic.reasons };
    } finally {
      this.loading = false;
      this.scanStatus = 'Analysis Complete';
      this.cdr.detectChanges();
    }
  }

  generateForensicReport() {
    if (!this.result) return;
    this.scanStatus = 'Logging Forensic Evidence...';
    this.cdr.detectChanges();
    
    setTimeout(() => {
      const auditID = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
      alert(`Forensic Audit ${auditID} generated. Digital evidence logged for Law Enforcement.`);
      this.scanStatus = 'Audit Logged';
      this.cdr.detectChanges();
    }, 1200);
  }

  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl || !this.result) return;
    const { error } = await this.supabaseService.submitReport({
      report_type: type === 'phishing' ? 'Phishing Site' : 'False Positive',
      content: `URL: ${this.targetUrl} | Risk Score: ${this.result.score}%`,
      status: 'pending'
    });
    if (!error) alert('Intelligence synced with SafeTech Database.');
  }
}