import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tech-buddy',
  templateUrl: './tech-buddy.html',
  styleUrl: './tech-buddy.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class TechBuddyComponent {
  userInput: string = '';
  chatHistory: { text: string; isUser: boolean }[] = [
    { text: 'Hello! I am your Tech Buddy. How can I help safeguard your digital world today?', isUser: false }
  ];

  sendMessage(predefinedMsg?: string) {
    const text = predefinedMsg || this.userInput;
    if (!text.trim()) return;

    // Add User Message
    this.chatHistory.push({ text: text, isUser: true });
    this.userInput = '';

    // Simulate AI Response for Flow 04 Demo
    setTimeout(() => {
      let response = "I'm analyzing that for you. Remember to never share your OTP!";
      if (text.toLowerCase().includes('report')) {
        response = "I can guide you! Please head to our 'Reporting' section (Flow 03) to submit official evidence.";
      } else if (text.toLowerCase().includes('url') || text.toLowerCase().includes('verify')) {
        response = "Please paste the URL here. I will check it against our phishing database instantly.";
      }
      this.chatHistory.push({ text: response, isUser: false });
    }, 1000);
  }
}