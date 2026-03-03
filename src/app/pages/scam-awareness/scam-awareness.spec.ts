import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScamAwareness } from './scam-awareness';

describe('ScamAwareness', () => {
  let component: ScamAwareness;
  let fixture: ComponentFixture<ScamAwareness>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScamAwareness],
    }).compileComponents();

    fixture = TestBed.createComponent(ScamAwareness);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
