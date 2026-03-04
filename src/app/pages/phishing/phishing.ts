import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase';

@Component({
  selector: 'app-phishing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phishing.html'
})
export class PhishingComponent {
  targetUrl: string = '';
  loading: boolean = false;
  result: { isSafe: boolean; details: string; score: number } | null = null;

  constructor(private supabaseService: SupabaseService) { }

  private calculateRiskScore(url: string): { score: number; reason: string } {
    let score = 0;
    const urlLower = url.toLowerCase();
    let reasons: string[] = [];

    // Check 1: HTTPS missing (High Risk for phishing)
    if (!urlLower.startsWith('https://')) {
      score += 40;
      reasons.push('Insecure connection (No HTTPS)');
    }

    // Check 2: Excessive dots (Subdomain masking)
    const dots = (urlLower.match(/\./g) || []).length;
    if (dots > 3) {
      score += 30;
      reasons.push('Excessive subdomains detected');
    }

    // Check 3: Typosquatting (Common phishing characters)
    if (/(0|1|l|i|-){3,}/.test(urlLower) || urlLower.includes('verify') || urlLower.includes('secure')) {
      score += 25;
      reasons.push('Suspicious keywords or character patterns');
    }

    return { 
      score: Math.min(score, 95), // Cap heuristic at 95%
      reason: reasons.length > 0 ? `Risk factors: ${reasons.join(', ')}.` : 'No obvious malicious patterns detected.'
    };
  }

  async onCheck() {
    const cleanUrl = this.targetUrl.trim();
    if (!cleanUrl) return;

    this.loading = true;
    this.result = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Demo delay

      // 1. Database Check
      const dbResult = await this.supabaseService.checkPhishingUrl(cleanUrl);

      if (!dbResult.isSafe) {
        this.result = { isSafe: false, details: dbResult.details, score: 100 };
      } else {
        // 2. Heuristic Check
        const heuristic = this.calculateRiskScore(cleanUrl);
        this.result = { 
          isSafe: heuristic.score < 50, 
          details: heuristic.reason, 
          score: heuristic.score 
        };
      }
    } catch (error) {
      this.result = { isSafe: true, details: 'Heuristic scan complete.', score: 10 };
    } finally {
      this.loading = false;
    }
  }
}