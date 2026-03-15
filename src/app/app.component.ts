import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TechBuddyBubbleComponent } from './shared/components/tech-buddy-bubble/tech-buddy-bubble';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FooterComponent } from './shared/components/footer/footer';
import { AccessibilityWidgetComponent } from './shared/components/accessibility-widget/accessibility-widget';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, TechBuddyBubbleComponent, NavbarComponent, FooterComponent, AccessibilityWidgetComponent], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'] // Make sure this matches your actual file extension (.scss or .css)
})
export class AppComponent {
  title = 'SafeTech';
  isAdminShell = false;

  constructor(private router: Router) {
    this.updateShellMode(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateShellMode(event.urlAfterRedirects));
  }

  private updateShellMode(url: string) {
    this.isAdminShell = url.startsWith('/admin');
  }
}
