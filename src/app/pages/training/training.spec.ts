import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingComponent } from './training'; // Changed from Training

describe('TrainingComponent', () => {
  let component: TrainingComponent;
  let fixture: ComponentFixture<TrainingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Use declarations for non-standalone components
      declarations: [TrainingComponent], 
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});