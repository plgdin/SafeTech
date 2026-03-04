import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // This tells Angular how to handle UI updates
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes)
  ]
};