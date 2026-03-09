import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessibilityWidget } from './accessibility-widget';

describe('AccessibilityWidget', () => {
  let component: AccessibilityWidget;
  let fixture: ComponentFixture<AccessibilityWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessibilityWidget],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessibilityWidget);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
