import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  standalone: false // No 'imports: []' allowed when using AppModule
})
export class ContactComponent {}