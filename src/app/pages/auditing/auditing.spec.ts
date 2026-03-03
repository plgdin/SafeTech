import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Auditing } from './auditing';

describe('Auditing', () => {
  let component: Auditing;
  let fixture: ComponentFixture<Auditing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auditing],
    }).compileComponents();

    fixture = TestBed.createComponent(Auditing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
