import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject 
} from '@angular/core';

import { Router } from '@angular/router';
import { ViewerSessionService } from '../service/viewer-session.service.js';

@Component({
  selector: 'app-configuratore',
  standalone:true,
  imports: [],
  templateUrl: './configuratore.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ConfiguratoreComponent {
  title='configuratore';
  private readonly router = inject(Router);
  private readonly viewerSession = inject(ViewerSessionService);

  isLoading = false;

  async upload() {
    this.isLoading = true;

    const glb = document.querySelector('#glb') as HTMLInputElement | null;

    if (!glb?.files?.[0]) {
      alert('Caricare il GLB.');
      this.isLoading = false;
      return;
    }

    try {
      await this.viewerSession.setFile(glb.files[0]);
      this.router.navigate(['/configurazione']);
    } catch (err) {
      console.error(err);
      alert('Upload al backend fallito.');
    } finally {
      this.isLoading = false;
    }


  }
}
