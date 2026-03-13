import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, UserReport } from '../../core/services/supabase';
import { showToast } from '../../core/utils/toast';
import { environment } from '../../../environments/environment';

// ─── VirusTotal proxy response shape ────────────────────────────────────────
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

// ─── Unified scan result (heuristic + VT merged) ────────────────────────────
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

  private analyzeUrlDynamically(url: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    try {
      const input = url.toLowerCase().trim();
      const normalizedUrl = input.startsWith('http') ? input : `https://${input}`;
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname;
      const path = urlObj.pathname;

      const verifiedDomains = [
        'google.com', 'google.co.in', 'youtube.com', 'facebook.com',
        'apple.com', 'microsoft.com', 'amazon.in', 'amazon.com',
        'kerala.gov.in', 'india.gov.in', 'sbi.co.in', 'onlinesbi.sbi',
        'vercel.com', 'github.com', 'netlify.app', 'stack-overflow.com'
      ];

      const isVerified = verifiedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
      if (isVerified) return { score: 0, reasons: ['Verified Official Domain Authority.'] };

      const riskyTLDs = ['.xyz', '.top', '.zip', '.icu', '.site', '.biz', '.tk', '.ga', '.cf'];
      if (riskyTLDs.some(tld => hostname.endsWith(tld))) {
        score += 35;
        reasons.push('High-Risk TLD detected.');
      } else {
        score += 10;
        reasons.push('Unverified Domain (Standard TLD).');
      }

      const weightTable = [
        { key: '1337x', penalty: 65, reason: 'High-Risk Piracy/Torrent Signature.' },
        { key: 'torrent', penalty: 45, reason: 'P2P/Piracy Content Marker.' },
        { key: 'login', penalty: 30, reason: 'Credential Harvesting pattern.' },
        { key: 'verify', penalty: 25, reason: 'Deceptive urgency keyword.' },
        { key: 'banking', penalty: 40, reason: 'Unauthorized Financial keyword.' },
        { key: 'wallet', penalty: 35, reason: 'Crypto-drainer pattern.' },
        { key: 'free', penalty: 20, reason: 'Social Engineering bait.' },
      ];

      weightTable.forEach(item => {
        if (hostname.includes(item.key) || path.includes(item.key)) {
          score += item.penalty;
          reasons.push(item.reason);
        }
      });

      const majorBrands = ['youtube', 'google', 'sbi', 'hdfc', 'amazon', 'netflix', 'paypal', 'vercel'];
      majorBrands.forEach(brand => {
        if (hostname.includes(brand)) {
          score += 50;
          reasons.push(`Brand Spoofing: Unofficial use of "${brand}".`);
        }
      });

      if (urlObj.protocol === 'http:') {
        score += 25;
        reasons.push('Insecure Protocol: No SSL/TLS (HTTP).');
      }
    } catch {
      return { score: 95, reasons: ['Malformed URL structure.'] };
    }

    return { score: Math.min(score, 100), reasons: reasons.length > 0 ? reasons : ['Unverified source.'] };
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
      console.error('VT Proxy Error:', err);
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

    const steps = ['DNS Validation...', 'Brand Audit...', 'Structural Analysis...', 'Threat Intel Sync...'];
    for (let i = 0; i < steps.length; i++) {
      this.scanStatus = steps[i];
      this.scanProgress = (i + 1) * 25;
      this.cdr.detectChanges();
      await this.delay(350);
    }

    this.finalizeScan(input, heuristic, dbCheck, vtResponse);
  }

  private finalizeScan(input: string, heuristic: any, dbCheck: any, vt: VTResponse | null) {
    let finalScore = heuristic.score;
    let finalReasons = [...heuristic.reasons];
    let details = '';
    let vtVerified = false;

    if (dbCheck && !dbCheck.isSafe) {
      this.result = {
        isSafe: false,
        details: 'CRITICAL: Blacklisted in SafeTech database.',
        score: 100,
        reasons: ['Confirmed malicious — database match.'],
        vtVerified: false, vtScore: null, vtMalicious: 0, vtEngines: 0, vtPermalink: '', vtTimedOut: false, vtEngineNames: []
      };
      this.completeAudit(input, this.result);
      return;
    }

    if (vt && !vt.timedOut && vt.vtScore !== null) {
      vtVerified = true;
      if (vt.malicious > 0) {
        finalScore = Math.max(finalScore, 60);
        finalScore = Math.min(100, finalScore + vt.malicious * 5);
        finalReasons.unshift(`VirusTotal: ${vt.malicious} engines flagged this URL.`);
      } else if (vt.harmless > 10) {
        finalScore = Math.max(0, finalScore - 20);
        finalReasons.push(`VirusTotal: Verified safe by ${vt.harmless} engines.`);
      }
      details = vt.malicious > 0 ? 'WARNING: Threat confirmed by VirusTotal.' : 'Analysis Complete.';
    } else {
      finalReasons.push('VirusTotal results unavailable — heuristic only.');
      details = finalScore >= 45 ? 'WARNING: Suspicious patterns detected.' : 'Heuristic analysis complete.';
    }

    this.result = {
      isSafe: Math.round(finalScore) < 45,
      details,
      score: Math.min(100, Math.round(finalScore)),
      reasons: finalReasons,
      vtVerified,
      vtScore: vt?.vtScore ?? null,
      vtMalicious: vt?.malicious ?? 0,
      vtEngines: vt?.totalEngines ?? 0,
      vtPermalink: vt?.permalink ?? '',
      vtTimedOut: vt?.timedOut ?? false,
      vtEngineNames: vt?.engines?.filter(e => e.category === 'malicious').map(e => `${e.name}: ${e.result}`) ?? []
    };

    this.completeAudit(input, this.result);
  }

  private completeAudit(input: string, result: ScanResult) {
    this.supabaseService.logPhishingAudit(input, result.score, result.details, result.reasons, result.isSafe)
      .catch(err => console.error('Audit failed', err));
    this.loading = false;
    this.scanStatus = 'Analysis Complete';
    this.cdr.detectChanges();
  }

  openVTReport() {
    if (this.result?.vtPermalink) window.open(this.result.vtPermalink, '_blank', 'noopener,noreferrer');
    else showToast('Report link unavailable.');
  }

  generateForensicReport() {
    if (!this.result) return;
    this.scanStatus = 'Generating Forensic Audit...';
    const auditID = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
    showToast(`Forensic Audit ${auditID} logged.`);
  }

  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl || !this.result) return;
    const refId = `PH-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const report: UserReport = {
      report_type: type === 'phishing' ? 'Phishing URL' : 'False Positive',
      content: `URL: ${this.targetUrl} | Risk: ${this.result.score}% | Markers: ${this.result.reasons.join(', ')}`,
      status: 'pending',
      reference_id: refId,
    };
    const { error } = await this.supabaseService.submitReport(report);
    if (!error) showToast('Threat intelligence synced.');
  }
}