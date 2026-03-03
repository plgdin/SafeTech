import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss', // <--- Add this comma
  standalone: false
})
export class NavbarComponent {
  isMenuOpen = false; // For mobile toggle

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}