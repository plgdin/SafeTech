import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // MUST HAVE THIS

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule], // MUST HAVE THIS
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'SafeTech';
}