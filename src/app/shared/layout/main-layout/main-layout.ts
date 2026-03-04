import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // Fixes 'router-outlet' error
import { NavbarComponent } from '../../components/navbar/navbar'; // Fixes 'app-navbar' error
import { FooterComponent } from '../../components/footer/footer'; // Fixes 'app-footer' error

@Component({
  selector: 'app-main-layout',
  standalone: true, // Must be true
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent], // Register them here
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayoutComponent {}