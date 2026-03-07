import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HomeComponent } from './home';
import { RouterTestingModule } from '@angular/router/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest'; // Ensure Vitest imports if needed

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should handle the preloader lifecycle', fakeAsync(() => {
    // Initial state check
    // Using .toBe(true/false) which is compatible with Vitest
    expect(component.isLoading).toBe(true);
    expect(component.isHiding).toBe(false);

    // Fast-forward 1.5s for the first timeout
    tick(1500);
    fixture.detectChanges();
    expect(component.isHiding).toBe(true);

    // Fast-forward another 1s for the second timeout
    tick(1000);
    fixture.detectChanges();
    expect(component.isLoading).toBe(false);
  }));

  it('should set video time to 4s when handleVideoEnd is called', () => {
    // Mock the video element using vi.fn() instead of jasmine.createSpy
    const mockVideo = {
      currentTime: 0,
      play: vi.fn().mockImplementation(() => Promise.resolve())
    };
    
    // Inject the mock into the component's ElementRef
    component.videoElement = { nativeElement: mockVideo as any };
    
    component.handleVideoEnd();
    
    expect(mockVideo.currentTime).toBe(4);
    expect(mockVideo.play).toHaveBeenCalled();
  });
});