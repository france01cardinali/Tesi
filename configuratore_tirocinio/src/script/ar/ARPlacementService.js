import * as THREE from "three";

export class ARPlacementService {
  constructor(options = {}) {
    // Soglie "guardia" usate per decidere se una hit XR e adatta al placement.
    // Le unita sono metri.
    this.minUpDot = options.minUpDot ?? 0.92;  // Quanto la superficie deve essere orizzontale.
    this.minBelowCameraMeters = options.minBelowCameraMeters ?? 0.25; // Hit almeno X m sotto la camera.
    this.requireSemanticFloor = options.requireSemanticFloor ?? false;
    this.maxAbsFloorYOffset = options.maxAbsFloorYOffset ?? 0.8; // Banda verticale assoluta attorno a y=0.
    this.maxFloorDelta = options.maxFloorDelta ?? 0.12; // Tolleranza verticale rispetto al floor stimato.
    this.minPlaneSpanMeters = options.minPlaneSpanMeters ?? 0.6; // Piano minimo accettato.
    this.minHitDistanceMeters = options.minHitDistanceMeters ?? 0.2; // Scarta hit troppo vicine alla camera.
    this.floorYLerp = options.floorYLerp ?? 0.15;
    this.useAbsoluteFloorZero = options.useAbsoluteFloorZero ?? false; // True: floor assoluto y=0, false: floor stimato.






    // Modalita debug: riduce i falsi negativi rendendo i filtri piu permissivi.
    if (options.debugRelaxed) {
      this.minUpDot = 0.7;
      this.minBelowCameraMeters = 0.05;
      this.maxFloorDelta = 0.5;
      this.minPlaneSpanMeters = 0;
      this.minHitDistanceMeters = 0.05;
      this.requireSemanticFloor = false;
    }

    // Stato stimato del pavimento: serve a dare stabilita verticale.
    this.floorYEstimate = 0;
    this.floorYMinObserved = Infinity;

    // oggetti temporanei
    // Oggetti temporanei per evitare allocazioni per frame.
    this.tmpMat = new THREE.Matrix4();
    this.tmpQuat = new THREE.Quaternion();
    this.tmpUp = new THREE.Vector3();

  }





  reset() {
    this.floorYEstimate = 0;
    this.floorYMinObserved = Infinity;
  }







  // per candidare il migliore secondo regole
  // Seleziona la hit "migliore" in base ai filtri e a uno score (floor + distanza).
  selectBest(results, referenceSpace, camPos) {
    let best = null;
    let bestScore = Infinity;

    // se nessuna hit passa i filtri, tieni comunque la piu bassa
    // Fallback: se nessuna hit passa i filtri, usa comunque la hit piu bassa.
    let fallbackBest = null;
    let fallbackBestY = Infinity;

    for (const hit of results) {
      // Pose hit nel reference space attivo.
      const pose = hit.getPose(referenceSpace);
      if (!pose) continue;

      // filtro plane-detection se disponibile
      // Filtro plane-detection (quando disponibile sul device).
      const plane = hit.plane;
      const hasPlane = !!plane;
      if (plane) {
        if (plane.orientation && plane.orientation !== "horizontal") continue;
        if (this.requireSemanticFloor && plane.semanticLabel && plane.semanticLabel !== "floor") continue;
        if (!this.hasEnoughPlaneSpan(plane)) continue;
      }

      // calcolo dell'up della superficie
      // Calcolo del vettore "up" locale della superficie.
      this.tmpMat.fromArray(pose.transform.matrix);
      this.tmpQuat.setFromRotationMatrix(this.tmpMat);
      this.tmpUp.set(0, 1, 0).applyQuaternion(this.tmpQuat).normalize();
     
      // Guardia inclinazione piano.
      if (hasPlane && this.tmpUp.y < this.minUpDot) continue;

      const p = pose.transform.position;
      // Guardia altezza camera: evita hit su muri/fronte camera.
      if (p.y > camPos.y - this.minBelowCameraMeters) continue;

      // aggiorna floorYMinObserved con il minimo y osservato
      // Aggiorna minimo y osservato per stimare il floor.
      if (p.y < this.floorYMinObserved) {
        this.floorYMinObserved = p.y;
      }

      // clacola distanza camera-hit (al quadrato)
      // Distanza camera-hit (quadrato, evita sqrt).
      const dx = p.x - camPos.x;
      const dy = p.y - camPos.y;
      const dz = p.z - camPos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < this.minHitDistanceMeters * this.minHitDistanceMeters) continue;

      // Fallback migliore quota piu bassa, anche se floor band non passa.
      // Fallback "hit piu bassa" anche se floor band non passa.
      if (p.y < fallbackBestY) {
        fallbackBest = pose;
        fallbackBestY = p.y;
      }

      // banda pavimento, accetta solo y vicina al pavimento stimato
      // Guardia principale sulla banda di quota pavimento.
      if (!this.isWithinFloorBand(p.y)) continue;

      // calcolo floorRef
      // Riferimento verticale usato per lo score.
      const floorRef = this.useAbsoluteFloorZero
        ? 0
        : (Number.isFinite(this.floorYMinObserved) ? this.floorYMinObserved : this.floorYEstimate);

      // prima premia quota vicina al pavimento, poi distanza camera
      // Score: prima vicinanza al floor, poi distanza dalla camera.
      const floorDelta = Math.abs(p.y - floorRef);
      const score = floorDelta * 6 + d2;

      // se score migliore, aggiorna best
      // Tiene la migliore hit candidata.
      if (score < bestScore) {
        best = pose;
        bestScore = score;
      }
    }

    // se non c'e best ma c'e fallbackBest usa fallbackBest
    // Nessuna hit valida: usa fallback piu bassa per non perdere continuita.
    if (!best && fallbackBest) {
      best = fallbackBest;
    }

    return best;
  }







  // Rivalida la posizione corrente del reticle contro i risultati hit attuali.
  checkReticlePosition(results, reticle, referenceSpace, camPos){



    if (!results?.length) return null;
  if (!reticle || !referenceSpace) return null;

  // 1) posizione world del reticle (Three)
  // 1) Posizione world del reticle da matrice.
  const rx = reticle.matrix.elements[12];
  const ry = reticle.matrix.elements[13];
  const rz = reticle.matrix.elements[14];

  // 2) soglia di matching (epsilon)
  // 2) Soglia matching tra reticle e hit.
  const eps = 0.03;      // 3 cm
  const eps2 = eps * eps;

  // 3) trova l'hit piu vicino al reticle
  // 3) Aggancio hit piu vicina sul piano XZ.
  let bestPose = null;
  let bestHit = null;
  let bestD2 = Infinity;

  for (const hit of results) {
    const pose = hit.getPose(referenceSpace);
    if (!pose) continue;

    const p = pose.transform.position;

    // se durante pan la Y del reticle e forzata, conviene matchare solo su XZ
    // Durante pan la Y e bloccata, quindi match su XZ.
    const dx = p.x - rx;
    const dz = p.z - rz;
    const dy = 0; // <-- XZ-only (metti p.y-ry se vuoi 3D)

    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestPose = pose;
      bestHit = hit;
    }
  }

  // 4) se nessun hit e vicino abbastanza non matcha
  // 4) Se nessuna hit e vicina abbastanza, non valida.
  if (!bestPose || bestD2 > eps2) return null;

  // STEP 1 finito: hit agganciata coerente col reticle.
  // STEP 2: applica gli stessi filtri di selectBest alla hit agganciata.

  const pose = bestPose;
  const plane = bestHit?.plane;
  const hasPlane = !!plane;

  if (plane) {
    if (plane.orientation && plane.orientation !== "horizontal") return null;
    if (this.requireSemanticFloor && plane.semanticLabel && plane.semanticLabel !== "floor") return null;
    if (!this.hasEnoughPlaneSpan(plane)) return null;
  }

  this.tmpMat.fromArray(pose.transform.matrix);
  this.tmpQuat.setFromRotationMatrix(this.tmpMat);
  this.tmpUp.set(0, 1, 0).applyQuaternion(this.tmpQuat).normalize();
  if (hasPlane && this.tmpUp.y < this.minUpDot) return null;

  const p = pose.transform.position;
  if (p.y > camPos.y - this.minBelowCameraMeters) return null;

  if (p.y < this.floorYMinObserved) this.floorYMinObserved = p.y;

  const dx2 = p.x - camPos.x;
  const dy2 = p.y - camPos.y;
  const dz2 = p.z - camPos.z;
  const dCam2 = dx2 * dx2 + dy2 * dy2 + dz2 * dz2;
  if (dCam2 < this.minHitDistanceMeters * this.minHitDistanceMeters) return null;

  if (!this.isWithinFloorBand(p.y)) return null;

  return pose;
  }

































































  acceptBest(bestPose) {
    this.floorYEstimate = THREE.MathUtils.lerp(
      this.floorYEstimate,
      bestPose.transform.position.y,
      this.floorYLerp
    );
  }







  // filtro quota pavimento
  // Guardia quota pavimento.
  isWithinFloorBand(y) {
    // se y non finito return false
    // Valore non numerico/non finito: invalido.
    if (!Number.isFinite(y)) return false;

    // se useAbsoluteFloorZero: |y| <= maxAbsFloorYOffset
    // Modalita assoluta: banda attorno a y=0.
    if (this.useAbsoluteFloorZero) {
      return Math.abs(y) <= this.maxAbsFloorYOffset;
    }

    // altrimenti usa banda attorno a floorYEstimate (maxFloorDelta)
    // Modalita stimata: banda attorno al floor stimato.
    if (Number.isFinite(this.floorYEstimate)) {
      return Math.abs(y - this.floorYEstimate) <= this.maxFloorDelta;
    }

    // altrimenti fallback su banda assoluta
    // Fallback conservativo.
    return Math.abs(y) <= this.maxAbsFloorYOffset;
  }






  
  // filtro piano abbastanza grande
  // Guardia estensione minima piano.
  hasEnoughPlaneSpan(plane) {
    // se non ha plane.polygon o minPlaneSpanMeters=0 -> true
    // Nessun poligono o filtro disabilitato: accetta.
    if (!plane || !plane.polygon || !this.minPlaneSpanMeters) return true;

    const poly = plane.polygon;
    if (!poly.length) return true;

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    // calcola bounding 2D in x e z del poligono del piano
    // Bounding 2D XZ del poligono.
    for (const pt of poly) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.z < minZ) minZ = pt.z;
      if (pt.z > maxZ) maxZ = pt.z;
    }

    // calcola spanX, spanZ
    // Span lungo gli assi principali del piano.
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;

    // span uguale al massimo tra spanX e spanZ
    // Estensione effettiva considerata per il filtro.
    const span = Math.max(spanX, spanZ);

    return Number.isFinite(span) ? span >= this.minPlaneSpanMeters : true;
  }

  isValidPosition(reticlePosition) {
    if (!reticlePosition) return false;
    if (!Number.isFinite(reticlePosition.x)) return false;
    if (!Number.isFinite(reticlePosition.y)) return false;
    if (!Number.isFinite(reticlePosition.z)) return false;
    return this.isWithinFloorBand(reticlePosition.y);
  }


}
