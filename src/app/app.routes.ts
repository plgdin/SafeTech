import { Routes } from '@angular/router';

// Component Imports
import { HomeComponent } from './pages/home/home';
import { ContactComponent } from './pages/contact/contact';
import { ResourcesComponent } from './pages/resources/resources';
import { AuditingComponent } from './pages/auditing/auditing';
import { TechBuddyComponent } from './pages/tech-buddy/tech-buddy';
import { PhishingComponent } from './pages/phishing/phishing';
import { ScamAwarenessComponent } from './pages/scam-awareness/scam-awareness';
import { TrainingComponent } from './pages/training/training';
import { AboutComponent } from './pages/about/about';

// Standalone Routes Configuration
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'contact', component: ContactComponent },
  { path: 'resources', component: ResourcesComponent },
  { path: 'reporting', component: AuditingComponent }, // Standardizing Flow 03
  { path: 'tech-buddy', component: TechBuddyComponent }, // Standardizing Flow 04
  
  // FIX: Path now matches the 'Phishing' folder and home.html link
  { path: 'phishing-checker', component: PhishingComponent }, 
  
  // FIX: Path now matches the 'Scam-Awareness' folder
  { path: 'scams', component: ScamAwarenessComponent }, 
  
  { path: 'training', component: TrainingComponent }, // Standardizing Flow 07
  { path: 'about', component: AboutComponent },
  
  // Catch-all for 404s to keep the demo smooth
  { path: '**', redirectTo: '' }
];