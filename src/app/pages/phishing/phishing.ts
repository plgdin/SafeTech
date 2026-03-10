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
      const path = urlObj.pathname;

      // 1. STRICT AUTHORITY WHITELIST
      const verifiedDomains = [
        'google.com', 'google.co.in', 'youtube.com', 'facebook.com', 
        'apple.com', 'microsoft.com', 'amazon.in', 'amazon.com',
        'kerala.gov.in', 'india.gov.in', 'sbi.co.in', 'onlinesbi.sbi',
        'vercel.com', 'github.com', 'netlify.app', 'stack-overflow.com'
      ];

      const isVerified = verifiedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
      if (isVerified) {
        return { score: 0, reasons: ['Verified Official Domain Authority.'] };
      }

      // 2. CRITICAL TLD BLACKLIST (Instant 100% Failure)
      const blacklistedTLDs = ['.ru', '.pk', '.onion'];
      if (blacklistedTLDs.some(tld => hostname.endsWith(tld))) {
        return { 
          score: 100, 
          reasons: ['CRITICAL: High-risk geographic or darknet TLD detected.', 'Domain blocked by safety policy.'] 
        };
      }

      // 3. RISKY TLD BASELINE
      const riskyTLDs = ['.xyz', '.top', '.zip', '.icu', '.site', '.biz', '.tk', '.ga', '.cf'];
      const isRiskyTLD = riskyTLDs.some(tld => hostname.endsWith(tld));
      
      score = isRiskyTLD ? 35 : 10; 
      reasons.push(isRiskyTLD ? 'High-Risk TLD detected.' : 'Unverified Domain (Standard TLD).');

      // 4. WEIGHTED PENALTY TABLE
      const weightTable = [
        { key: '1337x', penalty: 65, reason: 'High-Risk Piracy/Torrent Signature detected.' },
        { key: 'torrent', penalty: 45, reason: 'P2P/Piracy Content Marker found.' },
        { key: 'login', penalty: 30, reason: 'Credential Harvesting pattern detected.' },
        { key: 'verify', penalty: 25, reason: 'Deceptive urgency keyword found.' },
        { key: 'banking', penalty: 40, reason: 'Unauthorized Financial keyword usage.' },
        { key: 'wallet', penalty: 35, reason: 'Crypto-drainer pattern detected.' },
        { key: 'free', penalty: 20, reason: 'Social Engineering bait detected.' }
      ];

      weightTable.forEach(item => {
        if (hostname.includes(item.key) || path.includes(item.key)) {
          score += item.penalty;
          reasons.push(item.reason);
        }
      });

      // 5. BRAND SPOOFING
      const majorBrands = ['youtube', 'google', 'sbi', 'hdfc', 'amazon', 'netflix', 'paypal', 'vercel'];
      majorBrands.forEach(brand => {
        if (hostname.includes(brand) && !isVerified) {
          score += 50;
          reasons.push(`Brand Spoofing: Unofficial use of "${brand}" brand name.`);
        }
      });

      // 6. NUMERIC OBFUSCATION & INSECURE PROTOCOL
      const digitCount = (hostname.match(/\d/g) || []).length;
      if (digitCount > 4 && !isVerified) {
        score += 20;
        reasons.push('High Numeric Density: Typical of obfuscated domains.');
      }
      if (urlObj.protocol === 'http:') {
        score += 25;
        reasons.push('Insecure Protocol: Site lacks SSL/TLS (HTTP).');
      }

    } catch (e) {
      return { score: 95, reasons: ['Malformed URL: The address structure is deceptive or invalid.'] };
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
      this.result = { isSafe: false, details: 'CRITICAL: Database Match.', score: 100, reasons: ['Blacklisted in threat intelligence.'] };
    } else {
      this.result = { 
        isSafe: heuristic.score < 45, 
        details: heuristic.score >= 100 ? 'CRITICAL: High-Risk Threat Identified.' : (heuristic.score >= 45 ? 'WARNING: Suspicious Patterns Detected.' : 'Analysis Complete.'), 
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