import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TechBuddyBubbleComponent } from './shared/components/tech-buddy-bubble/tech-buddy-bubble';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FooterComponent } from './shared/components/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  // Add NavbarComponent and FooterComponent here!
  imports: [RouterModule, TechBuddyBubbleComponent, NavbarComponent, FooterComponent], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'] // Make sure this matches your actual file extension (.scss or .css)
})
export class AppComponent {
  title = 'SafeTech';
}