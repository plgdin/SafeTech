import { Component } from '@angular/core';
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
  result: { isSafe: boolean; details: string; score: number; reasons: string[] } | null = null;

  constructor(private supabaseService: SupabaseService) { }

  private calculateRiskScore(url: string): { score: number; reasons: string[] } {
    let score = 0;
    let reasons: string[] = [];
    const urlLower = url.toLowerCase().trim();

    const safeDomains = ['google.com', 'twitch.tv', 'youtube.com', 'github.com', 'instagram.com', 'facebook.com'];
    if (safeDomains.some(d => urlLower.includes(d))) return { score: 0, reasons: ['Verified Safe Domain.'] };

    if (urlLower.startsWith('http://')) {
      score += 45;
      reasons.push('Insecure connection (HTTP)');
    }

    const badTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.zip', '.top', '.icu'];
    if (badTLDs.some(tld => urlLower.includes(tld))) {
      score += 40;
      reasons.push('High-risk domain extension detected');
    }

    const suspiciousPatterns = [
      { regex: /(0|1|l|i|-){3,}/, reason: 'Typosquatting/look-alike characters' },
      { regex: /verify|secure|update|login|banking|account/, reason: 'Urgency-based keywords' },
      { regex: /(\..*){3,}/, reason: 'Excessive subdomains (URL masking)' }
    ];

    suspiciousPatterns.forEach(p => {
      if (p.regex.test(urlLower)) {
        score += 25;
        reasons.push(p.reason);
      }
    });

    return { score: Math.min(score, 99), reasons: reasons.length > 0 ? reasons : ['No suspicious patterns found.'] };
  }

  async onCheck() {
    const input = this.targetUrl.trim();
    if (!input || this.loading) return;

    this.loading = true;
    this.result = null;

    // KILL SWITCH: If the DB takes more than 5 seconds, we cancel the wait
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );

    try {
      // Race the DB check against our 5-second timeout
      const dbCheckPromise = this.supabaseService.checkPhishingUrl(input);
      
      const dbCheck = await Promise.race([dbCheckPromise, timeout]) as any;
      const heuristic = this.calculateRiskScore(input);

      if (!dbCheck.isSafe) {
        this.result = { isSafe: false, details: dbCheck.details, score: 100, reasons: ['Blacklisted Domain'] };
      } else {
        this.result = { 
          isSafe: heuristic.score < 50, 
          details: dbCheck.details || 'Heuristic pattern scan complete.', 
          score: heuristic.score,
          reasons: heuristic.reasons
        };
      }
    } catch (error) {
      console.error('Scan system bypassed or timed out:', error);
      // If the DB hangs, we immediately show heuristic results so the user isn't waiting
      const heuristic = this.calculateRiskScore(input);
      this.result = { 
        isSafe: heuristic.score < 50, 
        details: 'Cloud database unreachable. Showing local heuristic results.', 
        score: heuristic.score, 
        reasons: heuristic.reasons 
      };
    } finally {
      // GUARANTEED: The button will unlock no matter what
      this.loading = false;
    }
  }

  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl) return;
    const report: UserReport = {
      report_type: type === 'phishing' ? 'Phishing Site' : 'False Positive',
      content: `URL: ${this.targetUrl} | Risk: ${this.result?.score}%`,
      status: 'pending'
    };
    const { error } = await this.supabaseService.submitReport(report);
    if (!error) alert('Report submitted successfully!');
  }
}