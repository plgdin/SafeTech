import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TechBuddyBubbleComponent } from './tech-buddy-bubble';
import { FormsModule } from '@angular/forms';

describe('TechBuddyBubbleComponent', () => {
  let component: TechBuddyBubbleComponent;
  let fixture: ComponentFixture<TechBuddyBubbleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechBuddyBubbleComponent, FormsModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TechBuddyBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle the chat window open and closed', () => {
    expect(component.isOpen).toBe(false);
    
    component.toggleChat();
    expect(component.isOpen).toBe(true);
    
    component.toggleChat();
    expect(component.isOpen).toBe(false);
  });

  it('should add a user message and clear the input', () => {
    const initialMessageCount = component.messages.length;
    
    component.userInput = 'How do I report a scam?';
    component.sendMessage();
    
    expect(component.messages.length).toBe(initialMessageCount + 1);
    expect(component.messages[initialMessageCount].sender).toBe('user');
    expect(component.messages[initialMessageCount].text).toBe('How do I report a scam?');
    expect(component.userInput).toBe('');
  });

  it('should not add an empty message', () => {
    const initialMessageCount = component.messages.length;
    
    component.userInput = '   ';
    component.sendMessage();
    
    expect(component.messages.length).toBe(initialMessageCount);
  });

  it('should trigger bot logic after a delay', fakeAsync(() => {
    const initialMessageCount = component.messages.length;
    
    component.userInput = '1930';
    component.sendMessage();
    
    // Fast-forward the 600ms setTimeout
    tick(600);
    
    // Now there should be the user message + the bot's response
    expect(component.messages.length).toBe(initialMessageCount + 2);
    expect(component.messages[initialMessageCount + 1].sender).toBe('bot');
    expect(component.messages[initialMessageCount + 1].text).toContain('1930');
  }));
});