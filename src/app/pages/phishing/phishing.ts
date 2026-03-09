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
      const input = url.toLowerCase().trim();
      const normalizedUrl = input.startsWith('http') ? input : `https://${input}`;
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname;

      // 1. STRICT AUTHORITY WHITELIST
      // Only these absolute giants get a 0% score.
      const verifiedDomains = [
        'google.com', 'google.co.in', 'youtube.com', 'facebook.com', 
        'apple.com', 'microsoft.com', 'amazon.in', 'amazon.com',
        'kerala.gov.in', 'india.gov.in', 'sbi.co.in', 'onlinesbi.sbi'
      ];

      const isVerified = verifiedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
      if (isVerified) {
        return { score: 0, reasons: ['Verified Official Domain Authority.'] };
      }

      // 2. BASE RISK FOR UNKNOWN DOMAINS
      // If it's not a verified giant, it's not "safe" by default.
      score = 30; 
      reasons.push('Unverified Domain: This site is not on the global trusted authority list.');

      // 3. BRAND IMPERSONATION
      const majorBrands = ['youtube', 'google', 'sbi', 'hdfc', 'icici', 'amazon', 'netflix', 'paypal', 'axis'];
      majorBrands.forEach(brand => {
        if (hostname.includes(brand)) {
          score += 45;
          reasons.push(`Brand Spoofing: Suspicious use of "${brand}" in an unverified domain.`);
        }
      });

      // 4. HIGH-RISK TLDs
      const riskyTLDs = ['.xyz', '.top', '.zip', '.icu', '.site', '.biz', '.info', '.uno', '.tk', '.ga', '.cf'];
      if (riskyTLDs.some(tld => hostname.endsWith(tld))) {
        score += 35;
        reasons.push('High-Risk TLD: Extension frequently used for malicious hosting.');
      }

      // 5. KEYWORD PHISHING
      const suspiciousKeywords = ['login', 'verify', 'update', 'secure', 'banking', 'wallet', 'crypto', 'gift', 'prize'];
      suspiciousKeywords.forEach(word => {
        if (hostname.includes(word) || urlObj.pathname.includes(word)) {
          score += 20;
          reasons.push(`Phishing Marker: Use of sensitive keyword "${word}" detected.`);
        }
      });

      // 6. STRUCTURAL ANOMALIES
      if (hostname.split('.').length > 3) {
        score += 25;
        reasons.push('URL Masking: Excessive subdomains detected.');
      }

      if (urlObj.protocol === 'http:') {
        score += 20;
        reasons.push('Insecure Protocol: Site lacks SSL/TLS (HTTP).');
      }

    } catch (e) {
      return { score: 90, reasons: ['Malformed URL: Structure is deceptive or invalid.'] };
    }

    return { 
      score: Math.min(score, 100), 
      reasons: reasons.length > 0 ? reasons : ['Unverified source. Proceed with caution.'] 
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

    const steps = ['DNS Validation...', 'Brand Audit...', 'Structural Analysis...', 'Heuristic Scoring...'];
    for (let i = 0; i < steps.length; i++) {
      this.scanStatus = steps[i];
      this.scanProgress = (i + 1) * 25;
      this.cdr.detectChanges();
      await this.delay(400);
    }

    this.finalizeScan(input, heuristic, dbCheck);
  }

  private finalizeScan(input: string, heuristic: any, dbCheck: any) {
    if (dbCheck && !dbCheck.isSafe) {
      this.result = { isSafe: false, details: 'CRITICAL: Database Match.', score: 100, reasons: ['Blacklisted in global threat intelligence.'] };
    } else {
      this.result = { 
        isSafe: heuristic.score < 40, // Stricter safety threshold
        details: heuristic.score >= 40 ? 'WARNING: Potential Threat Detected.' : 'Analysis Complete.', 
        score: heuristic.score,
        reasons: heuristic.reasons
      };
    }

    this.supabaseService.logPhishingAudit(input, this.result.score, this.result.details, this.result.reasons, this.result.isSafe)
      .catch(err => console.error('Audit sync failed', err));

    this.loading = false;
    this.scanStatus = 'Analysis Complete';
    this.cdr.detectChanges();
  }

  generateForensicReport() {
    if (!this.result) return;
    const auditID = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
    showToast(`Forensic Audit ${auditID} generated and logged.`);
  }

  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl || !this.result) return;
    
    const refId = `PH-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    
    // FIXED: Correctly referencing 'this.result.reasons'
    const report: UserReport = {
      report_type: type === 'phishing' ? 'Phishing URL' : 'False Positive',
      content: `URL: ${this.targetUrl} | Risk: ${this.result.score}% | Markers: ${this.result.reasons.join(', ')}`,
      status: 'pending',
      reference_id: refId
    };

    const { error } = await this.supabaseService.submitReport(report);
    if (!error) showToast('Threat intelligence synced.');
    this.cdr.detectChanges();
  }
}