import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourcesComponent } from './resources'; // Changed from Resources
import { SupabaseService } from '../../core/services/supabase';

describe('ResourcesComponent', () => {
  let component: ResourcesComponent;
  let fixture: ComponentFixture<ResourcesComponent>;

  beforeEach(async () => {
    // Creating a basic mock for Supabase so the test doesn't crash
    const mockSupabaseService = {
      getScams: () => Promise.resolve({ data: [], error: null })
    };

    await TestBed.configureTestingModule({
      imports: [ResourcesComponent],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});