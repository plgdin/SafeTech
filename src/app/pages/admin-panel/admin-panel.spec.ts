import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPanelComponent } from './admin-panel';

describe('AdminPanelComponent', () => {
  let component: AdminPanelComponent;
  let fixture: ComponentFixture<AdminPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the admin panel', () => {
    expect(component).toBeTruthy();
  });

  it('should default to chats section', () => {
    expect(component.activeSection).toBe('chats');
  });

  it('should change active section when setSection is called', () => {
    component.setSection('bookings');
    expect(component.activeSection).toBe('bookings');
  });

  it('should correctly identify loading state', () => {
    component.isLoading = true;
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.spinner')).toBeTruthy();
  });
});