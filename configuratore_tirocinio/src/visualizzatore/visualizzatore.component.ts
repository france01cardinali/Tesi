import { Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject  } from '@angular/core';

import { Router } from '@angular/router';
import { ViewerSessionService } from '../service/viewer-session.service.js';

@Component({
  selector: 'app-visualizzatore',
  standalone:true,
  imports: [],
  templateUrl: './visualizzatore.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VisualizzatoreComponent {
  title='visualizzatore';
  private readonly router = inject(Router);
  private readonly viewerSession = inject(ViewerSessionService);

  isLoading = false;

  async upload() {
    this.isLoading = true;

    const glb = document.querySelector('#glb') as HTMLInputElement | null;
    const json = document.querySelector('#json') as HTMLInputElement | null;

    if (!glb?.files?.[0] || !json?.files?.[0]) {
      alert('Caricare il GLB e il file di configurazione.');
      this.isLoading = false;
      return;
    }

    try {
      await this.viewerSession.setFiles(glb.files[0], json.files[0]);
      this.router.navigate(['/viewe']);
    } catch (err) {
      console.error(err);
      alert('Upload al backend fallito.');
    } finally {
      this.isLoading = false;
    }


  }

}
