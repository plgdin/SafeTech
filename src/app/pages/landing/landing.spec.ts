import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent], // Import standalone component directly
      providers: [
        provideRouter([]) // Provides mock routing for the routerLink directives
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with the preloader visible', () => {
    // Updated for Vitest syntax
    expect(component.isLoading).toBe(true);
    expect(component.isHiding).toBe(false);
  });

  it('should trigger the hide animation after 1500ms and remove loader after 2500ms', fakeAsync(() => {
    // Trigger ngOnInit
    fixture.detectChanges(); 

    // Fast-forward 1.5 seconds (1500ms)
    tick(1500);
    
    // The slide-up animation should have started
    expect(component.isHiding).toBe(true);
    // The loader should still be in the DOM while animating
    expect(component.isLoading).toBe(true); 

    // Fast-forward another 1 second (1000ms)
    tick(1000);
    
    // The loader should now be completely removed from the DOM
    expect(component.isLoading).toBe(false); 
  }));
});