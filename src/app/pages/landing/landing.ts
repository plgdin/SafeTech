import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // <-- Fixed this line!

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class LandingComponent implements OnInit {
  isLoading = true;
  isHiding = false;

  ngOnInit() {
    // Hold the loading screen for 1.5 seconds, then trigger the slide-up animation
    setTimeout(() => {
      this.isHiding = true;
      
      // Completely remove the loader from the DOM after the animation finishes
      setTimeout(() => {
        this.isLoading = false;
      }, 1000); 
    }, 1500);
  }
}