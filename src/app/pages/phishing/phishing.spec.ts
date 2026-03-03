import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Phishing } from './phishing';

describe('Phishing', () => {
  let component: Phishing;
  let fixture: ComponentFixture<Phishing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Phishing],
    }).compileComponents();

    fixture = TestBed.createComponent(Phishing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
