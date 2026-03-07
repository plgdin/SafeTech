import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TechBuddyBubbleComponent } from './shared/components/tech-buddy-bubble/tech-buddy-bubble';
// 1. Import the NavbarComponent
import { NavbarComponent } from './shared/components/navbar/navbar'; 

@Component({
  selector: 'app-root',
  standalone: true,
  // 2. Add NavbarComponent to this array
  imports: [
    RouterModule, 
    TechBuddyBubbleComponent, 
    NavbarComponent
  ], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'SafeTech';
}