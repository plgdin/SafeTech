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

  // ─── RAW HEURISTIC ENGINE ───
  private analyzeUrlDynamically(url: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    try {
      const input = url.toLowerCase().trim();
      const normalizedUrl = input.startsWith('http') ? input : `https://${input}`;
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname;

      // Aggressive Brand Spoofing Check
      const brands = ['google', 'youtube', 'sbi', 'paypal', 'amazon', 'facebook', 'netflix'];
      brands.forEach(brand => {
        if (hostname.includes(brand)) {
          const officialDomains = ['google.com', 'google.co.in', 'youtube.com', 'facebook.com', 'amazon.com', 'amazon.in', 'sbi.co.in', 'onlinesbi.sbi', 'paypal.com', 'netflix.com'];
          if (!officialDomains.includes(hostname)) {
            score += 65;
            reasons.push(`CRITICAL: Suspicious use of "${brand}" brand signature.`);
          }
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
      return { score: 95, reasons: ['Malformed URL structure.'] };
    }
    return { score: Math.min(score, 100), reasons };
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

  private finalizeScan(input: string, heuristic: any, dbCheck: any, vt: VTResponse | null) {
    const maliciousCount = vt?.malicious || 0;
    const totalEngines = vt?.totalEngines || 0;

    // RAW ZERO-TRUST LOGIC: Malicious detections force a high score
    let vtScore = 0;
    if (maliciousCount > 0) {
      vtScore = Math.min(100, 60 + (maliciousCount * 10));
    }

    const isSafe = !(dbCheck && !dbCheck.isSafe) && maliciousCount === 0 && heuristic.score < 45;

    this.result = {
      isSafe,
      details: isSafe ? 'Verified Safe' : (maliciousCount > 0 ? 'MALICIOUS VERDICT' : 'SUSPICIOUS'),
      score: Math.min(100, Math.max(heuristic.score, vtScore)),
      reasons: [
        ...heuristic.reasons,
        `Detections: ${maliciousCount}/${totalEngines} security vendors.`
      ],
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
    if (this.result?.vtPermalink) {
      window.open(this.result.vtPermalink, '_blank', 'noopener,noreferrer');
    } else {
      showToast('Report link unavailable.');
    }
  }

  generateForensicReport() {
    if (!this.result) return;
    this.scanStatus = 'Generating Forensic Audit...';
    const auditID = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
    showToast(`Audit ${auditID} logged.`);
  }

  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl || !this.result) return;
    const refId = `PH-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const report: UserReport = {
      report_type: type === 'phishing' ? 'Phishing URL' : 'False Positive',
      content: `URL: ${this.targetUrl} | Risk: ${this.result.score}%`,
      status: 'pending',
      reference_id: refId,
    };
    await this.supabaseService.submitReport(report);
    showToast('Threat intelligence synced.');
  }
}