import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true, // MUST BE ADDED
  imports: [CommonModule, RouterModule], // Necessary for links to work
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {}