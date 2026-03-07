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
  
  // State management for Complaint flow
  currentFlow: 'chat' | 'ask_name' | 'ask_contact' | 'ask_details' = 'chat';
  complaintData = { name: '', contact: '', details: '' };

  messages: Message[] = [
    { 
      text: "Hello! I'm **TechBuddy**. I can answer cybersecurity questions, provide helplines, or help you register a complaint. How can I assist you?", 
      sender: 'bot', 
      time: new Date() 
    }
  ];

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    const text = this.userInput;
    this.messages.push({ text, sender: 'user', time: new Date() });
    this.userInput = '';

    // Artificial delay for realism
    setTimeout(() => this.handleLogic(text), 700);
  }

  handleLogic(input: string) {
    const lowInput = input.toLowerCase();

    // COMPLAINT FLOW LOGIC
    if (this.currentFlow === 'ask_name') {
      this.complaintData.name = input;
      this.addBotMsg(`Thank you, ${input}. Please provide your **Email or Phone Number** so we can contact you.`);
      this.currentFlow = 'ask_contact';
      return;
    }

    if (this.currentFlow === 'ask_contact') {
      this.complaintData.contact = input;
      this.addBotMsg("Received. Now, please provide a **brief description** of the incident.");
      this.currentFlow = 'ask_details';
      return;
    }

    if (this.currentFlow === 'ask_details') {
      this.complaintData.details = input;
      this.addBotMsg("Success! Your complaint has been registered locally. For financial fraud, we also recommend calling **1930** immediately.");
      console.log('Final Complaint:', this.complaintData);
      this.currentFlow = 'chat';
      return;
    }

    // GENERAL CHAT LOGIC
    if (lowInput.includes('complaint') || lowInput.includes('report')) {
      this.addBotMsg("I can help with that. First, what is your **Full Name**?");
      this.currentFlow = 'ask_name';
    } else if (lowInput.includes('1930') || lowInput.includes('helpline') || lowInput.includes('number')) {
      this.addBotMsg("The National Cyber Cell helpline is **1930**. It is available 24/7 for reporting financial frauds.");
    } else if (lowInput.includes('phishing')) {
      this.addBotMsg("Phishing involves fake links sent via SMS/Email. You can use our **URL Checker** in the menu to stay safe!");
    } else {
      this.addBotMsg("I'm trained in cybersecurity. You can ask me about scams, reporting, or the 1930 helpline.");
    }
  }

  addBotMsg(msg: string) {
    this.messages.push({ text: msg, sender: 'bot', time: new Date() });
  }
}