import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessibilityWidgetComponent } from './accessibility-widget';

describe('AccessibilityWidget', () => {
  let component: AccessibilityWidgetComponent;
  let fixture: ComponentFixture<AccessibilityWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessibilityWidgetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessibilityWidgetComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
