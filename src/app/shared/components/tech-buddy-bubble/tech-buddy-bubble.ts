import { Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../../../environments/environment';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { SupabaseService } from '../../../core/services/supabase';

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

  private systemInstruction = `You are TechBuddy, an official cybersecurity AI assistant for the SafeTech government campaign in Kerala, India.

CRITICAL RULES:
1. You MUST strictly limit all responses to cybersecurity, online safety, scam reporting, phishing, and the 1930 national cyber helpline.
2. If a user asks about anything unrelated to cybersecurity (e.g., coding, recipes, weather, general knowledge), politely decline and state that you are programmed strictly for cybersecurity assistance.
3. LANGUAGE: You are fluent in English, Malayalam, and Manglish (Malayalam written in English script). You must match the user's language.
4. Keep responses helpful, authoritative, concise, and empathetic to victims of scams.`;

  private chatSession: Awaited<ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['startChat']>> | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private supabaseService: SupabaseService
  ) {
    if (environment.geminiApiKey) {
      const genAI = new GoogleGenerativeAI(environment.geminiApiKey);
      const chatModel = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: this.systemInstruction,
      });

      this.chatSession = chatModel.startChat({ history: [] });
    } else {
      console.warn('Gemini API key missing. Tech Buddy will stay available with a fallback response.');
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  toggleChat() {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
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
      if (!this.chatSession) {
        throw new Error('Chat session unavailable');
      }

      /* 1️⃣ Get response from Gemini */
      const aiResult = await this.chatSession.sendMessage(input);
      const rawText = aiResult.response.text();

      /* 2️⃣ Save chat log to Supabase */
      const logResult = await this.supabaseService.saveChatLog(input, rawText);

      if (logResult?.error) {
        console.error("Supabase Chat Log Error:", logResult.error);
      }

      /* 3️⃣ Convert Markdown → HTML */
      const htmlText = await marked.parse(rawText);
      const safeHtml = DOMPurify.sanitize(htmlText);

      /* 4️⃣ Show bot response in UI */
      this.messages.push({
        text: safeHtml,
        sender: 'bot'
      });

    } catch (error) {

      console.error('TechBuddy AI Error:', error);

      this.messages.push({
        text: "Connection to Guardian Protocol disrupted. Please check your connection.",
        sender: 'bot'
      });

    } finally {

      this.isLoading = false;
      this.cdr.detectChanges();
      this.scrollToBottom();

    }
  }
}
