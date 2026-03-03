import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; // Required for Forms
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// --- Shared Components ---
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FooterComponent } from './shared/components/footer/footer';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout';

// --- Page Components ---
import { HomeComponent } from './pages/home/home';
import { AboutComponent } from './pages/about/about';
import { ContactComponent } from './pages/contact/contact';
import { ResourcesComponent } from './pages/resources/resources';
import { AuditingComponent } from './pages/auditing/auditing';
import { TechBuddyComponent } from './pages/tech-buddy/tech-buddy';
import { PhishingComponent } from './pages/phishing/phishing';
import { ScamAwarenessComponent } from './pages/scam-awareness/scam-awareness';
import { TrainingComponent } from './pages/training/training';

@NgModule({
  declarations: [
    AppComponent,
    // Register Shared
    NavbarComponent,
    FooterComponent,
    MainLayoutComponent,
    // Register Pages
    HomeComponent,
    AboutComponent,
    ContactComponent,
    ResourcesComponent,
    AuditingComponent,
    TechBuddyComponent,
    PhishingComponent,
    ScamAwarenessComponent,
    TrainingComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule // Added for your reporting forms
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }