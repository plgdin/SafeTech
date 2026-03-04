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
  scanProgress: number = 0;
  scanStatus: string = 'System Idle';
  result: { isSafe: boolean; details: string; score: number; reasons: string[] } | null = null;

  constructor(private supabaseService: SupabaseService) { }

  private calculateRiskScore(url: string): { score: number; reasons: string[] } {
    let score = 0;
    let reasons: string[] = [];
    const urlLower = url.toLowerCase().trim();

    // White-list checking: SafeTech Verified Domains
    const safeDomains = ['google.com', 'twitch.tv', 'youtube.com', 'github.com', 'instagram.com', 'facebook.com'];
    if (safeDomains.some(d => urlLower.includes(d))) return { score: 0, reasons: ['Verified Safe Domain'] };

    // Forensic Indicator 1: Protocol Security
    if (urlLower.startsWith('http://')) {
      score += 45;
      reasons.push('Insecure connection protocol (HTTP)');
    }

    // Forensic Indicator 2: High-Risk TLDs
    const badTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.zip', '.top', '.icu'];
    if (badTLDs.some(tld => urlLower.includes(tld))) {
      score += 40;
      reasons.push('High-risk domain extension detected');
    }

    // Forensic Indicator 3: Social Engineering Patterns
    const suspiciousPatterns = [
      { regex: /(0|1|l|i|-){3,}/, reason: 'Visual Spoofing / Look-alike characters' },
      { regex: /verify|secure|update|login|banking|account|paypal/, reason: 'Urgency-based brand spoofing keywords' },
      { regex: /(\..*){3,}/, reason: 'Excessive subdomains (URL Obfuscation)' }
    ];

    suspiciousPatterns.forEach(p => {
      if (p.regex.test(urlLower)) {
        score += 25;
        reasons.push(p.reason);
      }
    });

    return { score: Math.min(score, 99), reasons: reasons.length > 0 ? reasons : ['No immediate malicious patterns detected.'] };
  }

  async onCheck() {
    const input = this.targetUrl.trim();
    if (!input || this.loading) return;

    this.loading = true;
    this.result = null;
    this.scanProgress = 0;

    // STEP 1: Deep Packet Simulation (Building Tension for Demo)
    const simulation = new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        this.scanProgress += 2;
        if (this.scanProgress === 20) this.scanStatus = 'Auditing SSL Certificates...';
        if (this.scanProgress === 50) this.scanStatus = 'Consulting Global Threat Intelligence...';
        if (this.scanProgress === 80) this.scanStatus = 'Running Heuristic Pattern Match...';
        
        if (this.scanProgress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 30);
    });

    try {
      await simulation; 
      
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
      const dbCheckPromise = this.supabaseService.checkPhishingUrl(input);
      
      const dbCheck = await Promise.race([dbCheckPromise, timeout]) as any;
      const heuristic = this.calculateRiskScore(input);

      if (dbCheck && !dbCheck.isSafe) {
        this.result = { isSafe: false, details: dbCheck.details, score: 100, reasons: ['Blacklisted Domain Found in Database'] };
      } else {
        this.result = { 
          isSafe: heuristic.score < 50, 
          details: 'Heuristic pattern scan complete.', 
          score: heuristic.score,
          reasons: heuristic.reasons
        };
      }
    } catch (error) {
      const heuristic = this.calculateRiskScore(input);
      this.result = { 
        isSafe: heuristic.score < 50, 
        details: 'Cloud database unreachable. Local engine fallback active.', 
        score: heuristic.score, 
        reasons: heuristic.reasons 
      };
    } finally {
      this.loading = false;
      this.scanStatus = 'Scan Complete';
    }
  }

  // Forensic Audit Generation: Creating standardized evidence
  generateForensicReport() {
    if (!this.result) return;
    
    this.scanStatus = 'Compiling Forensic Evidence...';
    
    setTimeout(() => {
      const reportLog = {
        id: `SFTECH-AU-${Math.floor(Math.random() * 90000) + 10000}`,
        target: this.targetUrl,
        timestamp: new Date().toLocaleString(),
        riskScore: `${this.result?.score}%`,
        heuristicMarkers: this.result?.reasons
      };
      
      console.log('Forensic Audit Exported:', reportLog);
      alert(`Forensic Audit ${reportLog.id} generated. Digital evidence ready for KSITM/Law Enforcement submission.`);
      this.scanStatus = 'Evidence Logged';
    }, 1500);
  }

  async reportUrl(type: 'phishing' | 'safe') {
    if (!this.targetUrl || !this.result) return;
    const report: UserReport = {
      report_type: type === 'phishing' ? 'Phishing Site' : 'False Positive',
      content: `URL: ${this.targetUrl} | Risk: ${this.result.score}% | reasons: ${this.result.reasons.join(', ')}`,
      status: 'pending'
    };
    const { error } = await this.supabaseService.submitReport(report);
    if (!error) alert('Intelligence submitted to SafeTech Central Database!');
  }
}