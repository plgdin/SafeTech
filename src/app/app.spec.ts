import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    // You might need fixture.detectChanges() here depending on your Angular version
    fixture.detectChanges(); 
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    // Note: If you don't actually have an <h1> saying 'Hello, SafeTech' in your app.component.html, this test will fail.
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, SafeTech');
  });
});