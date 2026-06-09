import { Routes } from '@angular/router';
import { ConfigurazioneComponent } from '../configurazione/configurazione.component';
import { ConfiguratoreComponent } from '../configuratore/configuratore.component';
import { HomeComponent } from '../home/home.component';
import { VisualizzatoreComponent } from '../visualizzatore/visualizzatore.component';
import { VieweComponent } from '../viewe/viewe.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'configuratore', component: ConfiguratoreComponent },
  { path: 'configurazione', component: ConfigurazioneComponent },
  { path: 'visualizzatore', component: VisualizzatoreComponent },
  { path: 'viewe', component: VieweComponent }
];
