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

import { uploadViewe as uploadViewe } from '../script/main.js';
import {load as load} from '../script/main.js';
import { ThreeViewer } from '../script/viewer/ThreeViewer.js';
import { ViewerSessionService } from '../service/viewer-session.service.js';

@Component({
  selector: 'app-viewe',
  standalone: true,
  imports: [],
  templateUrl: './viewe.component.html',
})
export class VieweComponent implements AfterViewInit, OnDestroy {

  private readonly router = inject(Router);

  private readonly viewerSession = inject(ViewerSessionService);

  private canvasEl?: HTMLCanvasElement;
  private hostEl?: HTMLDivElement;
  private id?: String;
  
  @ViewChild('threeCanvas')
  set threeCanvasRef(v: ElementRef<HTMLCanvasElement> | undefined){
    this.canvasEl = v?.nativeElement;
    this.tryInitViewer();
  }

  @ViewChild('viewerHost')
  set viewerHostRef(v: ElementRef<HTMLDivElement> | undefined){
    this.hostEl = v?.nativeElement;
    this.tryInitViewer();
  }


  viewer?: ThreeViewer

  showSetup = true;
  isLoading = false;

  private shouldInitViewer = false;

  private glb?: any;
  private json?: any;

  async ngAfterViewInit(): Promise<void> {
    this.id = this.viewerSession.getId();
    console.log("this.id", this.id);
    
    if(!this.id){
      this.router.navigate(['/visualizzatore']);
    }else{
      this.glb = await this.viewerSession.getGlb(this.id);
      this.json = await this.viewerSession.getJson(this.id);

      if(!this.glb || !this.json){
        alert('Nessun file disponibile. Torna al visualizzatore.')
        this.router.navigate(['/visualizzatore']);
        return;
      }
      this.shouldInitViewer = true;
      this.tryInitViewer();

    } 

  

  }



  private async tryInitViewer(){
    if(!this.shouldInitViewer) return;
    if(!this.hostEl || !this.canvasEl) return;                       
    if(!this.glb || !this.json) return;
    if(this.viewer) return;

    try{
      this.viewer = new ThreeViewer({
        canvas: this.canvasEl,
        container: this.hostEl
      });

      await uploadViewe(this.glb, this.viewer, this.json);
      await load(this.viewer);
      if(!this.id) return;
      await this.viewerSession.deleteUpload(this.id);
    
    
    }catch(err){
      console.error(err);
      alert('errore durante il caricamento del viewer.')
      this.viewer?.dispose();
      this.viewer = undefined;
    }
  }

  ngOnDestroy(): void {
    this.viewer?.dispose();
  }


}
