import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // <-- YOU NEED THIS FOR ROUTERLINKS

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule], // <-- ADD IT HERE
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class FooterComponent { }