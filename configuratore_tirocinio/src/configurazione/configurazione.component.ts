import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  inject,
  AfterViewInit
} from '@angular/core';

//test
import { Router } from '@angular/router';

import { uploadConfigurazione as uploadConfigurazione } from '../script/main.js';
import { ThreeViewer } from '../script/viewer/ThreeViewer.js';
import { ViewerSessionService } from '../service/viewer-session.service.js';

@Component({
  selector: 'app-configurazione',
  standalone: true,
  imports: [],
  templateUrl: './configurazione.component.html'
})
export class ConfigurazioneComponent implements AfterViewInit, OnDestroy {
  //test
    private readonly router = inject(Router);

  private readonly viewerSession = inject(ViewerSessionService);


  // questi vengono valorizzati quando il DOM dell'@else esiste
    private canvasEl?: HTMLCanvasElement;
    private hostEl?: HTMLDivElement;
    private id?: String;

  
  
   
    // ViewChild con setter: si attiva quando Angular crea/distrugge la view
    @ViewChild('threeCanvas')
    set threeCanvasRef(v: ElementRef<HTMLCanvasElement> | undefined) {
      this.canvasEl = v?.nativeElement;
      this.tryInitViewer();
    }
  
    @ViewChild('viewerHost')
    set viewerHostRef(v: ElementRef<HTMLDivElement> | undefined) {
      this.hostEl = v?.nativeElement;
      this.tryInitViewer();
    } 
  
    viewer?: ThreeViewer;
   
  
    showSetup = true;
    isLoading = false;
  
    // flag per capire quando l’utente ha premuto "upload"
    private shouldInitViewer = false;
  
    // input file salvati prima di cambiare schermata
    private glb?: any;

    async ngAfterViewInit(): Promise<void> {
      this.id =  this.viewerSession.getId();
      //test
      if(!this.id){
        this.router.navigate(['']);
      }else{
        this.glb = await this.viewerSession.getGlb(this.id);
        
        if(!this.glb){
          alert('Nessun file disponibile. Torn al configuratore.');
          return;
        }

        this.shouldInitViewer = true;
        this.tryInitViewer();
      } 


    }
  
  

  
    private async tryInitViewer() {
      if (!this.shouldInitViewer) return;
      if (!this.canvasEl || !this.hostEl) return;
      if (!this.glb) return;
      if (this.viewer) return;
     

  
      try {
        // Viewer creato solo quando canvas + host sono davvero disponibili.
        this.viewer = new ThreeViewer({
          canvas: this.canvasEl,
          container: this.hostEl
        });
  
        /* const glbInput = this.fileToInput(this.glbFile);
        const jsonInput = this.fileToInput(this.jsonFile); */
        
        // Pipeline completa: parse JSON, load GLB, crea controlli dinamici.
        await uploadConfigurazione(this.glb, this.viewer);
        if(!this.id) return;
        await this.viewerSession.deleteUpload(this.id);


  
      } catch (err) {
        console.error(err);
      alert('Errore durante il caricamento del viewer.');
      this.viewer?.dispose();
      this.viewer = undefined;
      } 
    }
  

  
  
    ngOnDestroy(): void {
      this.viewer?.dispose();
    }
  




}
