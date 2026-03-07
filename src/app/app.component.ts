import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
// Notice the path now correctly points through the 'shared' folder
import { TechBuddyBubbleComponent } from './shared/components/tech-buddy-bubble/tech-buddy-bubble';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, TechBuddyBubbleComponent], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'SafeTech';
}