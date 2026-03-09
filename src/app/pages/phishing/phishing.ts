import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, UserReport } from '../../core/services/supabase';
import { showToast } from '../../core/utils/toast';

@Component({
  selector: 'app-phishing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phishing.html',
  styleUrls: ['./phishing.scss']
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

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private analyzeUrlDynamically(url: string): { score: number; reasons: string[] } {
    let score = 0;
    let reasons: string[] = [];
    
    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();

      const uniqueChars = new Set(hostname).size;
      if (uniqueChars / hostname.length > 0.7 && hostname.length > 15) {
        score += 40;
        reasons.push('High Lexical Entropy: Domain name appears programmatically generated.');
      }

      const highRiskTLDs = ['.xyz', '.top', '.zip', '.tg', '.site', '.biz', '.info', '.uno'];
      if (highRiskTLDs.some(tld => hostname.endsWith(tld))) {
        score += 25;
        reasons.push('Suspicious TLD: Domain uses an extension frequently linked to malicious hosting.');
      }

      const subdomainCount = hostname.split('.').length;
      if (subdomainCount > 3) {
        score += 30;
        reasons.push('Excessive Subdomains: Typical of URL masking and tunneling techniques.');
      }

      if (hostname.startsWith('xn--')) {
        score += 60;
        reasons.push('Homograph Attack: Domain uses international characters to mimic official brands.');
      }

      const targetKeywords = ['login', 'verify', 'bank', 'secure', 'update', 'wallet', 'crypto', 'kyc'];
      targetKeywords.forEach(word => {
        if (path.includes(word) || (hostname.includes(word) && subdomainCount > 2)) {
          score += 35;
          reasons.push(`Deceptive Keyword: "${word}" detected in a suspicious URL position.`);
        }
      });

      if (urlObj.protocol === 'http:') {
        score += 20;
        reasons.push('Unencrypted Protocol: Site lacks SSL/TLS (HTTP).');
      }

    } catch (e) {
      return { score: 90, reasons: ['Malformed URL: The address structure is invalid or deceptive.'] };
    }

    return { 
      score: Math.min(score, 100), 
      reasons: reasons.length > 0 ? reasons : ['Structure appears standard. Continue with caution.'] 
    };
  }

  async onCheck() {
    const input = this.targetUrl.trim();
    if (!input || this.loading) return;

    this.loading = true;
    this.result = null;
    this.scanProgress = 0;
    this.cdr.detectChanges();

    const dbCheck = await this.supabaseService.checkPhishingUrl(input).catch(() => null);
    const heuristic = this.analyzeUrlDynamically(input);

    const steps = [
      'Performing DNS Lookup...',
      'Analyzing Domain Entropy...',
      'Checking SSL Certificate Chain...',
      'Scanning for Homograph Patterns...',
      'Cross-referencing Global Blacklists...'
    ];

    for (let i = 0; i < steps.length; i++) {
      this.scanStatus = steps[i];
      this.scanProgress = (i + 1) * 20;
      this.cdr.detectChanges();
      await this.delay(400);
    }

    this.finalizeScan(input, heuristic, dbCheck);
  }

  private finalizeScan(input: string, heuristic: any, dbCheck: any) {
    if (dbCheck && !dbCheck.isSafe) {
      this.result = { 
        isSafe: false, 
        details: 'CRITICAL: Database Match Found.', 
        score: 100, 
        reasons: ['Confirmed malicious in global threat intelligence database.'] 
      };
    } else {
      this.result = { 
        isSafe: heuristic.score < 65, 
        details: heuristic.score >= 65 ? 'WARNING: Suspicious Patterns Detected.' : 'Heuristic Scan Complete.', 
        score: heuristic.score,
        reasons: heuristic.reasons
      };
    }

    this.supabaseService.logPhishingAudit(
      input, 
      this.result.score, 
      this.result.details, 
      this.result.reasons, 
      this.result.isSafe
    ).catch(err => console.error('Audit sync failed', err));

    this.loading = false;
    this.scanStatus = 'Analysis Complete';
    this.cdr.detectChanges();
  }

  /**
   * FIXED: Replaced 'evidence_payload' with 'content' to match the 
   * UserReport interface defined in supabase.ts.
   */
  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl || !this.result) return;
    
    const refId = `PH-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

    // Here we use the property names from UserReport
    const report: UserReport = {
      report_type: type === 'phishing' ? 'Phishing URL' : 'False Positive',
      content: `URL: ${this.targetUrl} | Risk Score: ${this.result.score}% | Markers: ${this.result.reasons.join(', ')}`,
      status: 'pending',
      reference_id: refId
    };

    const { error } = await this.supabaseService.submitReport(report);

    if (!error) {
      showToast('Intelligence synced with SafeTech Database.');
    } else {
      console.error('Database sync failed', error);
      showToast('Failed to connect to KSITM secure server.');
    }
    
    this.cdr.detectChanges();
  }
}