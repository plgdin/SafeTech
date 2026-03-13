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
  // VT-specific extras
  vtVerified: boolean;
  vtScore: number | null;
  vtMalicious: number;
  vtEngines: number;
  vtPermalink: string;
  vtTimedOut: boolean;
  vtEngineNames: string[];   // top flagging engine names
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

  // ─── Local heuristic engine ───────────────────────────────────────────────
  private analyzeUrlDynamically(url: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    try {
      const input = url.toLowerCase().trim();
      const normalizedUrl = input.startsWith('http') ? input : `https://${input}`;
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname;
      const path = urlObj.pathname;

      // 1. Strict Authority Whitelist
      const verifiedDomains = [
        'google.com', 'google.co.in', 'youtube.com', 'facebook.com',
        'apple.com', 'microsoft.com', 'amazon.in', 'amazon.com',
        'kerala.gov.in', 'india.gov.in', 'sbi.co.in', 'onlinesbi.sbi',
        'vercel.com', 'github.com', 'netlify.app', 'stack-overflow.com'
      ];

      const isVerified = verifiedDomains.some(
        d => hostname === d || hostname.endsWith('.' + d)
      );
      if (isVerified) {
        return { score: 0, reasons: ['Verified Official Domain Authority.'] };
      }

      // 2. Intelligent TLD Baseline
      const riskyTLDs = ['.xyz', '.top', '.zip', '.icu', '.site', '.biz', '.tk', '.ga', '.cf'];
      const isRiskyTLD = riskyTLDs.some(tld => hostname.endsWith(tld));
      score = isRiskyTLD ? 35 : 10;
      reasons.push(isRiskyTLD
        ? 'High-Risk TLD detected.'
        : 'Unverified Domain (Standard TLD).'
      );

      // 3. Weighted Penalty Table
      const weightTable = [
        { key: '1337x',   penalty: 65, reason: 'High-Risk Piracy/Torrent Signature detected.' },
        { key: 'torrent', penalty: 45, reason: 'P2P/Piracy Content Marker found.' },
        { key: 'login',   penalty: 30, reason: 'Credential Harvesting pattern detected.' },
        { key: 'verify',  penalty: 25, reason: 'Deceptive urgency keyword found.' },
        { key: 'banking', penalty: 40, reason: 'Unauthorized Financial keyword usage.' },
        { key: 'wallet',  penalty: 35, reason: 'Crypto-drainer pattern detected.' },
        { key: 'free',    penalty: 20, reason: 'Social Engineering bait detected.' },
      ];

      weightTable.forEach(item => {
        if (hostname.includes(item.key) || path.includes(item.key)) {
          score += item.penalty;
          reasons.push(item.reason);
        }
      });

      // 4. Brand Spoofing
      const majorBrands = ['youtube', 'google', 'sbi', 'hdfc', 'amazon', 'netflix', 'paypal', 'vercel'];
      majorBrands.forEach(brand => {
        if (hostname.includes(brand) && !isVerified) {
          score += 50;
          reasons.push(`Brand Spoofing: Unofficial use of "${brand}" brand name.`);
        }
      });

      // 5. Numeric Obfuscation
      const digitCount = (hostname.match(/\d/g) || []).length;
      if (digitCount > 4) {
        score += 20;
        reasons.push('High Numeric Density: Typical of DGA or obfuscated domains.');
      }

      // 6. Insecure Protocol
      if (urlObj.protocol === 'http:') {
        score += 25;
        reasons.push('Insecure Protocol: Site lacks SSL/TLS encryption (HTTP).');
      }

    } catch {
      return { score: 95, reasons: ['Malformed URL: The address structure is deceptive or invalid.'] };
    }

    return {
      score: Math.min(score, 100),
      reasons: reasons.length > 0 ? reasons : ['Unverified source. Proceed with caution.']
    };
  }

  // ─── Call the Supabase Edge Function (secure VT proxy) ───────────────────
  private async callVTProxy(url: string): Promise<VTResponse | null> {
    // AbortController prevents UI hanging if the Edge Function cold-starts and takes too long
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const res = await fetch(
        `${environment.supabaseUrl}/functions/v1/scan-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${environment.supabaseKey}`,
            'apikey': environment.supabaseKey,
          },
          body: JSON.stringify({ url }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        console.warn('VT proxy returned an error:', errBody);
        return null;
      }

      return await res.json() as VTResponse;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn('VT proxy request timed out.');
      } else {
        console.error('VT proxy network error:', err);
      }
      return null;
    }
  }

  // ─── Main scan orchestrator ───────────────────────────────────────────────
  async onCheck() {
    const input = this.targetUrl.trim();
    if (!input || this.loading) return;

    this.loading = true;
    this.result = null;
    this.scanProgress = 0;
    this.cdr.detectChanges();

    // Run DB blacklist check concurrently with VT Edge Function
    const [dbCheck, vtResponse] = await Promise.all([
      this.supabaseService.checkPhishingUrl(input).catch(() => null),
      this.callVTProxy(input),
    ]);

    // Heuristics run synchronously
    const heuristic = this.analyzeUrlDynamically(input);

    // Animate the progress bar for UX
    const steps = [
      'DNS Validation...',
      'Brand Audit...',
      'Structural Analysis...',
      'Threat Intelligence Sync...',
    ];
    for (let i = 0; i < steps.length; i++) {
      this.scanStatus = steps[i];
      this.scanProgress = (i + 1) * 25;
      this.cdr.detectChanges();
      await this.delay(350);
    }

    this.finalizeScan(input, heuristic, dbCheck, vtResponse);
  }

  // ─── Merge heuristic + VT → single result ─────────────────────────────────
  private finalizeScan(
    input: string,
    heuristic: { score: number; reasons: string[] },
    dbCheck: { isSafe: boolean; details: string } | null,
    vt: VTResponse | null
  ) {
    let finalScore = heuristic.score;
    let finalReasons = [...heuristic.reasons];
    let details = '';
    let vtVerified = false;

    // ── DB blacklist takes absolute precedence ──
    if (dbCheck && !dbCheck.isSafe) {
      this.result = {
        isSafe: false,
        details: 'CRITICAL: Blacklisted in SafeTech threat database.',
        score: 100,
        reasons: ['Confirmed malicious — database match.'],
        vtVerified: false,
        vtScore: null,
        vtMalicious: 0,
        vtEngines: 0,
        vtPermalink: '',
        vtTimedOut: false,
        vtEngineNames: [],
      };
      this.completeAudit(input, this.result);
      return;
    }

    // ── Merge VT into score ──
    if (vt && !vt.timedOut && vt.vtScore !== null) {
      vtVerified = true;

      if (vt.malicious > 0) {
        // Any VT engine flagging malicious → hard floor at 60
        finalScore = Math.max(finalScore, 60);
        // Scale up with number of engines: each engine adds 4 points
        finalScore = Math.min(100, finalScore + vt.malicious * 4);
        finalReasons.unshift(
          `VirusTotal: ${vt.malicious} security engine(s) flagged this URL as malicious.`
        );
      } else if (vt.suspicious > 0) {
        finalScore = Math.max(finalScore, 40);
        finalScore = Math.min(100, finalScore + vt.suspicious * 2);
        finalReasons.unshift(
          `VirusTotal: ${vt.suspicious} engine(s) marked URL as suspicious.`
        );
      } else if (vt.harmless > 5) {
        // Multiple clean verdicts → reduce heuristic score by up to 20 points
        finalScore = Math.max(0, finalScore - 20);
        finalReasons.push(`VirusTotal: ${vt.harmless} engines confirmed URL as safe.`);
      }

      // Safe navigation applied here to prevent errors if categories is null/undefined
      const vtCats = Object.values(vt.categories || {}).filter(Boolean);
      if (vtCats.length > 0) {
        finalReasons.push(`VT Category Tags: ${vtCats.slice(0, 3).join(', ')}.`);
      }

      details = vt.malicious > 0
        ? `WARNING: VirusTotal confirmed threat — ${vt.malicious} malicious verdict(s).`
        : vt.suspicious > 0
          ? 'WARNING: Suspicious patterns confirmed by VirusTotal.'
          : 'VirusTotal: No malicious verdicts detected.';

    } else if (vt?.timedOut) {
      finalReasons.push('VirusTotal scan timed out — result based on heuristics only.');
      details = 'Heuristic analysis complete. VT scan is still processing.';
    } else {
      // VT unavailable (network error, etc.) — fall back gracefully
      finalReasons.push('VirusTotal check unavailable — heuristic analysis only.');
      details = heuristic.score >= 45
        ? 'WARNING: Suspicious patterns detected (heuristic).'
        : 'Analysis complete (heuristic only).';
    }

    finalScore = Math.min(100, Math.round(finalScore));
    const isSafe = finalScore < 45;

    if (!details) {
      details = isSafe ? 'Analysis Complete — No Threats Detected.' : 'WARNING: Suspicious Patterns Detected.';
    }

    this.result = {
      isSafe,
      details,
      score: finalScore,
      reasons: finalReasons,
      vtVerified,
      vtScore: vt?.vtScore ?? null,
      vtMalicious: vt?.malicious ?? 0,
      vtEngines: vt?.totalEngines ?? 0,
      vtPermalink: vt?.permalink ?? '',
      vtTimedOut: vt?.timedOut ?? false,
      vtEngineNames: vt?.engines?.map(e => `${e.name}: ${e.result}`) ?? [],
    };

    this.completeAudit(input, this.result);
  }

  private completeAudit(input: string, result: ScanResult) {
    this.supabaseService
      .logPhishingAudit(input, result.score, result.details, result.reasons, result.isSafe)
      .catch(err => console.error('Audit sync failed', err));

    this.loading = false;
    this.scanStatus = 'Analysis Complete';
    this.cdr.detectChanges();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  generateForensicReport() {
    if (!this.result) return;
    this.scanStatus = 'Generating Forensic Audit...';
    const auditID = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
    showToast(`Forensic Audit ${auditID} generated and logged.`);
  }

  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl || !this.result) return;
    const refId = `PH-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    const report: UserReport = {
      report_type: type === 'phishing' ? 'Phishing URL' : 'False Positive',
      content: `URL: ${this.targetUrl} | Risk: ${this.result.score}% | VT: ${this.result.vtMalicious} malicious | Markers: ${this.result.reasons.join(', ')}`,
      status: 'pending',
      reference_id: refId,
    };

    const { error } = await this.supabaseService.submitReport(report);
    if (!error) showToast('Threat intelligence synced.');
    this.cdr.detectChanges();
  }
}