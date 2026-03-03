import { Component } from '@angular/core';

@Component({
  selector: 'app-phishing',
  templateUrl: './phishing.html',
  styleUrl: './phishing.scss',
  standalone: false
})
export class PhishingComponent {
  checkUrl(url: string) {
    console.log('Scanning URL:', url);
    // Logic for URL scanning goes here
  }
}