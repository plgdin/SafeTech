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
    // 1. Preloader logic: Hold for 1.5s, then trigger animation
    setTimeout(() => {
      this.isHiding = true;
      
      // 2. Remove from DOM after 1s animation
      setTimeout(() => {
        this.isLoading = false;
        // Start playing the video explicitly once the loader is gone
        this.startVideo();
      }, 1000); 
    }, 1500);
  }

  ngAfterViewInit() {
    // Attempt to start video as soon as the view is ready
    this.startVideo();
  }

  /**
   * Ensures the video starts playing.
   * Browsers often block autoplay unless the video is muted.
   */
  startVideo() {
    if (this.videoElement && this.videoElement.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.muted = true; // Required for most browsers to allow autoplay
      
      video.play().catch(error => {
        console.warn("Autoplay was prevented by the browser. Video will play upon user interaction.", error);
      });
    }
  }

  /**
   * Custom Loop Logic:
   * Called by (ended) event in the HTML.
   * Plays from 0s once, then loops from 4s onwards forever.
   */
  handleVideoEnd() {
    const video = this.videoElement.nativeElement;
    video.currentTime = 4; // Jump to the 4th second
    video.play();
  }
}