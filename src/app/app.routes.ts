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
import { AdminComponent } from './pages/admin/admin';
import { AdminLoginComponent } from './pages/admin-login/admin-login';
import { adminAuthGuard } from './core/guards/admin-auth.guard';

export const routes: Routes = [
  // App boots up directly to the Home page
  { path: '', component: HomeComponent },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  
  { path: 'contact', component: ContactComponent },
  { path: 'resources', component: ResourcesComponent },
  { path: 'reporting', component: AuditingComponent }, 
  { path: 'tech-buddy', component: TechBuddyComponent }, 
  { path: 'phishing-checker', component: PhishingComponent }, 
  { path: 'scams', component: ScamAwarenessComponent }, 
  { path: 'scam-awareness', component: ScamAwarenessComponent },
  { path: 'training', component: TrainingComponent }, 
  { path: 'about', component: AboutComponent },
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminAuthGuard] },
  
  { path: '**', redirectTo: '' }
];
