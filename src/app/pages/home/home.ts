import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit, AfterViewInit {
  // Grab the video element from the template using the #heroVideo reference
  @ViewChild('heroVideo') videoElement!: ElementRef<HTMLVideoElement>;

  isLoading = true;
  isHiding = false;

  constructor() {}

  ngOnInit() {
    // 1. Preloader logic: Hold for 1.5s, then trigger the "isHiding" animation
    setTimeout(() => {
      this.isHiding = true;
      
      // 2. Completely remove the loader from the DOM after the 1s CSS transition finishes
      setTimeout(() => {
        this.isLoading = false;
        
        // 3. FORCE the video to play only once the loader is gone and the video is visible
        this.startVideo();
      }, 1000); 
    }, 1500);
  }

  ngAfterViewInit() {
    // Initial attempt to start video when the view is ready
    // Note: Most browsers will block this until the element is actually visible/interacted with
    this.startVideo();
  }

  /**
   * Ensures the video starts playing.
   * Modern browsers strictly require the 'muted' attribute for programmatic play.
   */
  startVideo() {
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      
      // Ensure muted is true; browsers block autoplay with sound
      video.muted = true; 
      
      video.play().catch(error => {
        // This is a common warning if the user hasn't clicked anything on the page yet
        console.warn("Autoplay prevented. The video will start as soon as the preloader clears or user interacts.", error);
      });
    }
  }

  /**
   * Custom Loop Logic:
   * Called by the (ended) event in the home.html.
   * Plays the intro once, then loops from the 4-second mark onwards.
   */
  handleVideoEnd() {
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.currentTime = 4; // Jump to the 4th second for a seamless loop
      video.play();
    }
  }
}