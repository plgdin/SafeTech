import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibilityService } from '../../../core/services/accessibility.service';

@Component({
  selector: 'app-accessibility-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accessibility-widget.html',
  styleUrls: ['./accessibility-widget.scss']
})
export class AccessibilityWidgetComponent {

  isOpen = false;

  languages = [
    { code: 'en', label: 'English' },
    { code: 'ml', label: 'Malayalam' }
  ];

  constructor(public a11yService: AccessibilityService) {}

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  toggle(feature: any) {
    this.a11yService.toggleFeature(feature);
  }

  onLanguageChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.a11yService.changeLanguage(select.value);
  }

}