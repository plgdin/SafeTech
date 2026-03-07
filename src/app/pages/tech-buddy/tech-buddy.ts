import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  time: Date;
}

@Component({
  selector: 'app-tech-buddy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tech-buddy.html',
  styleUrls: ['./tech-buddy.scss']
})
export class TechBuddyComponent {
  isOpen = false;
  userInput = '';
  
  // State management for the complaint form
  currentFlow: 'chat' | 'name' | 'contact' | 'complaint' = 'chat';
  tempComplaintData = { name: '', contact: '', details: '' };

  messages: Message[] = [
    { 
      text: 'Namaste! I am TechBuddy. I can answer cyber-safety questions, provide helpline numbers, or help you register a complaint. How can I help?', 
      sender: 'bot', 
      time: new Date() 
    }
  ];

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    const userText = this.userInput;
    this.messages.push({ text: userText, sender: 'user', time: new Date() });
    this.userInput = '';

    setTimeout(() => this.processInput(userText), 600);
  }

  processInput(input: string) {
    const text = input.toLowerCase();

    // 1. Handle Complaint Registration Flow
    if (this.currentFlow === 'name') {
      this.tempComplaintData.name = input;
      this.addBotMessage(`Thank you, ${input}. Please provide your Email or Phone Number so our team can reach out.`);
      this.currentFlow = 'contact';
      return;
    }

    if (this.currentFlow === 'contact') {
      this.tempComplaintData.contact = input;
      this.addBotMessage("Got it. Now, please describe the cyber incident or complaint in detail.");
      this.currentFlow = 'complaint';
      return;
    }

    if (this.currentFlow === 'complaint') {
      this.tempComplaintData.details = input;
      this.addBotMessage("Thank you. Your complaint has been recorded. Our Cyber Cell officers will review it shortly. Reference ID: #SB" + Math.floor(Math.random() * 10000));
      console.log('Complaint Submitted:', this.tempComplaintData); // Here you'd call a backend service
      this.currentFlow = 'chat';
      return;
    }

    // 2. Handle General Queries
    if (text.includes('helpline') || text.includes('number') || text.includes('call')) {
      this.addBotMessage("For immediate assistance with financial cyber fraud, call the National Cyber Crime Helpline at **1930**.");
    } 
    else if (text.includes('complaint') || text.includes('register') || text.includes('report')) {
      this.addBotMessage("I can help you file a formal report. First, may I have your full name?");
      this.currentFlow = 'name';
    } 
    else if (text.includes('phishing') || text.includes('scam')) {
      this.addBotMessage("Phishing is when scammers try to steal your data via fake links. Never share your OTP or click unknown links!");
    } 
    else {
      this.addBotMessage("I'm TechBuddy, your cyber-guide. You can ask me about safe browsing, report a scam, or ask for the 1930 helpline.");
    }
  }

  addBotMessage(msg: string) {
    this.messages.push({ text: msg, sender: 'bot', time: new Date() });
  }
}