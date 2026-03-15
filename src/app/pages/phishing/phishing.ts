import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, UserReport } from '../../core/services/supabase';
import { showToast } from '../../core/utils/toast';
import { environment } from '../../../environments/environment';

export interface VTResponse {
  isSafe: boolean | null;
  vtScore: number | null;
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  totalEngines: number;
  permalink: string;
  timedOut: boolean;
  categories: Record<string, string>;
  engines: Array<{ name: string; result: string; category: string }>;
}

export interface ScanResult {
  isSafe: boolean;
  details: string;
  score: number;
  reasons: string[];
  vtVerified: boolean;
  vtScore: number | null;
  vtMalicious: number;
  vtEngines: number;
  vtPermalink: string;
  vtTimedOut: boolean;
  vtEngineNames: string[]; 
}

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
  result: ScanResult | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) { }

  private delay(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }

  private analyzeUrlDynamically(url: string): { score: number; reasons: string[]; isVerified: boolean } {
    let score = 0;
    const reasons: string[] = [];
    let isVerified = false;

    try {
      const input = url.toLowerCase().trim();
      const normalizedUrl = input.startsWith('http') ? input : `https://${input}`;
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname;

      const officialDomains = [
        'google.com', 'google.co.in', 'youtube.com', 'facebook.com', 
        'apple.com', 'microsoft.com', 'amazon.in', 'amazon.com',
        'kerala.gov.in', 'india.gov.in', 'sbi.co.in', 'onlinesbi.sbi',
        'vercel.com', 'github.com', 'netlify.app', 'netflix.com'
      ];

      isVerified = officialDomains.some(d => hostname === d || hostname.endsWith('.' + d));
      if (isVerified) return { score: 0, reasons: ['Verified Official Domain Authority.'], isVerified: true };

      const brands = ['google', 'youtube', 'sbi', 'paypal', 'amazon', 'facebook', 'netflix'];
      brands.forEach(brand => {
        if (hostname.includes(brand) && !isVerified) {
          score += 70;
          reasons.push(`CRITICAL: Suspicious use of "${brand}" brand signature.`);
        }
      });

      const riskyTLDs = ['.xyz', '.top', '.zip', '.icu', '.site', '.biz', '.tk', '.ga'];
      if (riskyTLDs.some(tld => hostname.endsWith(tld))) {
        score += 35;
        reasons.push('High-Risk TLD detected.');
      }

      if (urlObj.protocol === 'http:') {
        score += 25;
        reasons.push('Insecure Protocol: No SSL/TLS (HTTP).');
      }
    } catch {
      return { score: 95, reasons: ['Malformed URL structure.'], isVerified: false };
    }

    return { score: Math.min(score, 100), reasons, isVerified };
  }

  private async callVTProxy(url: string): Promise<VTResponse | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${environment.supabaseUrl}/functions/v1/scan-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${environment.supabaseKey}`,
          'apikey': environment.supabaseKey,
        },
        body: JSON.stringify({ url }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res.ok ? await res.json() : null;
    } catch (err) {
      clearTimeout(timeoutId);
      return null;
    }
  }

  async onCheck() {
    const input = this.targetUrl.trim();
    if (!input || this.loading) return;

    this.loading = true;
    this.result = null;
    this.scanProgress = 0;
    this.cdr.detectChanges();

    const [dbCheck, vtResponse] = await Promise.all([
      this.supabaseService.checkPhishingUrl(input).catch(() => null),
      this.callVTProxy(input),
    ]);

    const heuristic = this.analyzeUrlDynamically(input);

    const steps = ['DNS Validation...', 'Brand Audit...', 'Structural Analysis...', 'Intelligence Sync...'];
    for (let i = 0; i < steps.length; i++) {
      this.scanStatus = steps[i];
      this.scanProgress = (i + 1) * 25;
      this.cdr.detectChanges();
      await this.delay(350);
    }

    this.finalizeScan(input, heuristic, dbCheck, vtResponse);
  }

  private finalizeScan(
    input: string, 
    heuristic: { score: number; reasons: string[]; isVerified: boolean }, 
    dbCheck: any, 
    vt: VTResponse | null
  ) {
    const maliciousCount = vt?.malicious || 0;
    const totalEngines = vt?.totalEngines || 0;
    
    let isSafe = true;
    let vtScore = 0;

    if (dbCheck && !dbCheck.isSafe) {
      isSafe = false;
      vtScore = 100;
    } else if (maliciousCount > 0) {
      if (heuristic.isVerified && maliciousCount === 1) {
        isSafe = true;
        vtScore = 15; 
      } else if (!heuristic.isVerified && maliciousCount === 1) {
        isSafe = true; 
        vtScore = 40;
      } else {
        isSafe = false;
        vtScore = Math.min(100, 60 + (maliciousCount * 5));
      }
    } else if (heuristic.score >= 60) {
      isSafe = false;
    }

    this.result = {
      isSafe,
      details: isSafe ? (vtScore > 30 ? 'SUSPICIOUS (Low Risk)' : 'Verified Safe') : 'MALICIOUS VERDICT',
      score: Math.min(100, Math.max(heuristic.score, vtScore)),
      reasons: [...heuristic.reasons, `Vendor Detections: ${maliciousCount}/${totalEngines} engines flagged this URL.`],
      vtVerified: !!vt,
      vtScore: vtScore,
      vtMalicious: maliciousCount,
      vtEngines: totalEngines,
      vtPermalink: vt?.permalink || '',
      vtTimedOut: vt?.timedOut || false,
      vtEngineNames: vt?.engines?.filter(e => e.category === 'malicious').map(e => e.name) || []
    };

    this.supabaseService.logPhishingAudit(input, this.result.score, this.result.details, this.result.reasons, this.result.isSafe)
      .catch(err => console.error('Audit failed', err));

    this.loading = false;
    this.scanStatus = 'Analysis Complete';
    this.cdr.detectChanges();
  }

  openVTReport() {
    if (this.result?.vtPermalink) window.open(this.result.vtPermalink, '_blank', 'noopener,noreferrer');
    else showToast('Report link unavailable.');
  }

  // --- VOUCH & FLAG BACKEND INTEGRATION ---
  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl || !this.result) {
      showToast('No active scan to report.');
      return;
    }

    const refId = `REV-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const report: UserReport = {
      report_type: type === 'phishing' ? 'USER_FLAG_MALICIOUS' : 'USER_VOUCH_SAFE',
      content: JSON.stringify({
        url: this.targetUrl,
        risk_score: this.result.score,
        detections: `${this.result.vtMalicious}/${this.result.vtEngines}`,
        markers: this.result.reasons
      }),
      status: 'pending',
      reference_id: refId,
    };

    const { error } = await this.supabaseService.submitReport(report);
    if (!error) {
      showToast(`Request ${refId} submitted for Admin approval.`);
    } else {
      showToast('Submission failed. Try again later.');
    }
  }
}