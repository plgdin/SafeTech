import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// Import shared UI components here
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FooterComponent } from './shared/components/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  // Add components and modules here that were previously in AppModule
  imports: [RouterOutlet, NavbarComponent, FooterComponent], 
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'SafeTech';
}