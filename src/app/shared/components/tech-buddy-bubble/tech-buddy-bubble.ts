import { Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../../../environments/environment';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

@Component({
  selector: 'app-tech-buddy-bubble',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tech-buddy-bubble.html',
  styleUrls: ['./tech-buddy-bubble.scss']
})
export class TechBuddyBubbleComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isOpen = false;
  userInput = '';
  isLoading = false;
  
  messages: Message[] = [
    { text: "I am TechBuddy. How can I protect you today?", sender: 'bot' }
  ];

  private genAI = new GoogleGenerativeAI(environment.geminiApiKey);
  
  private systemInstruction = `You are TechBuddy, an official cybersecurity AI assistant for the SafeTech government campaign in Kerala, India. 
  
  CRITICAL RULES:
  1. You MUST strictly limit all responses to cybersecurity, online safety, scam reporting, phishing, and the 1930 national cyber helpline.
  2. If a user asks about anything unrelated to cybersecurity (e.g., coding, recipes, weather, general knowledge), politely decline and state that you are programmed strictly for cybersecurity assistance.
  3. LANGUAGE: You are fluent in English, Malayalam, and Manglish (Malayalam written in English script). You must match the user's language. If they ask in Manglish, reply in Manglish or simple English. If they ask in Malayalam, reply in Malayalam.
  4. Keep responses helpful, authoritative, concise, and empathetic to victims of scams.`;

  private chatModel = this.genAI.getGenerativeModel({
    model: "gemini-2.0-flash", // Updated to stable 2.0 version
    systemInstruction: this.systemInstruction,
  });

  private chatSession = this.chatModel.startChat({ history: [] });

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) {}
  }

  toggleChat() { 
    this.isOpen = !this.isOpen; 
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  /**
   * Logs the conversation to the Google Sheet for the Admin Panel
   */
  private async logToAdminPanel(userMsg: string, aiMsg: string) {
    try {
      // We send this as a background task; no need to wait for it for the UI to feel fast
      fetch(environment.googleScriptUrl, {
        method: 'POST',
        mode: 'no-cors', // standard for Google Apps Script POST
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logChat',
          userMsg: userMsg,
          aiMsg: aiMsg,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.warn('Logging to Admin Panel failed', e);
    }
  }

  async sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;
    
    const input = this.userInput;
    this.messages.push({ text: input, sender: 'user' });
    this.userInput = '';
    
    this.isLoading = true;
    this.cdr.detectChanges(); 
    this.scrollToBottom();

    try {
      const result = await this.chatSession.sendMessage(input);
      const rawText = result.response.text();
      
      const htmlText = await marked.parse(rawText);
      const safeHtml = DOMPurify.sanitize(htmlText);

      this.messages.push({ text: safeHtml, sender: 'bot' });

      // 🔥 NEW: Send data to Google Sheets for Admin Panel visibility
      this.logToAdminPanel(input, rawText);

    } catch (error) {
      console.error('TechBuddy AI Error:', error);
      this.messages.push({ 
        text: "Connection to Guardian Protocol disrupted. Please check your connectivity.", 
        sender: 'bot' 
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); 
      this.scrollToBottom();
    }
  }
}