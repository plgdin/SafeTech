import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechBuddy } from './tech-buddy';

describe('TechBuddy', () => {
  let component: TechBuddy;
  let fixture: ComponentFixture<TechBuddy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechBuddy],
    }).compileComponents();

    fixture = TestBed.createComponent(TechBuddy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
