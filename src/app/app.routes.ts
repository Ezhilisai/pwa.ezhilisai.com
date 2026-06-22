import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { BirthdayComponent } from './birthday/birthday.component';
import { AnniversariesComponent } from './anniversaries/anniversaries.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'birthday', component: BirthdayComponent },
  { path: 'anniversaries', component: AnniversariesComponent },
  { path: '**', component: HomeComponent }
];
