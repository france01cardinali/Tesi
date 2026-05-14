                                            
                                                    SETUP FUORI ARPLACEMENTDETECTION
                                                                |
                                                                V
                                                    crazione renderer, scene, camera
                                                                |
                                                                V
                                                    crarica modello in core.modelRoot
                                                                |
                                                                V
                                                    Abiliti WebXR(rendere.xr.enebled = true)
                                                                |
                                                                V
                                                            crea ARButton 
                                                    con feature hit-test e detection
                                                                |
                                                                V
                                                            Istanzia
                                                new ARPlacementDetection(core, options)
                                                               |||
                                                               |||
                                                               |||
                                                    L' UTENTE PREME "START AR"
                                                                |
                                                                V
                                                renderer.xr emette evento "sessionstart"
                                                                |
                                                                V
                                                    Scatta onSessionStart()
                                                                |
                                                                V
                                                            start(session)
                                                                |
                                                                V
                                                crea referenceSpace(local-floor o local)
                                                                |
                                                                V
                                                        crea viewerSpace
                                                                |   
                                                                V
                                                        crea hitTestSource
                                                                |
                                                                V
                                            nasconde modello (se hideModelUntilUntilPlacement)
                                                                |
                                                                V
                                                abilita tap placement (listener select)
                                                                |
                                                                V
                                                        isReady = true
                                                               |||
                                                               |||
                                                               |||                                            
                                                            RENDER LOOP
                                                                |
                                                                V
                                                    Animte() su ViewerCore chiama
                                                    placement.update(frame) frame XR
                                                                |
                                                                V
                                                            update() fa
                                                                |
                                                                V
                                                    chiede getHitTestResults()
                                                                |
                                                                V
                                                        seglie miglior hit
                                            (filtri di inclinazione, quota, dimensione piano)
                                                                |
                                                                V
                                                        salva lastValidHit
                                                                |
                                                                V
                                                        aggiorna floorYEstimate
                                                                |
                                                                V
                                                    mostra reticle nel punto
                                                                |
                                                                V
                                                Risultato: utente vede un reticolo sul pavimento
                                                    (quando trova un punto valido)


                                                    PIAZZAMENTO (TAP O AUTOPLACE)
                                                                |
                        =================================================================================                                                 
                        |                                                                               |
                        V                                                                               V
                    Caso 1: tap                                                                 Caso 2: autoplace
                        |                                                                               |
                        V                                                                               V
    l'utente tocca schermo -> WebXR manda "select"                                         update() trava hit valido
                        |                                                                               |
                        V                                                                               V
                    onSelect()                                                             se autoPlaceOnFirstValid = true
                        |                                                                               |
                        V                                                                               V
                    placeModel()                                                                 chiama placeModel()
                        |                                                                              |||
                        V                                                                              |||
            posiziona in x,z del hit                                                                   |||
                        |                                                                              |||
                        V                                                                              |||
            centra (euristica pivot)                                                                   |||
                        |                                                                              ||| 
                        V                                                                              |||
alza/abbassa per far combaciare box.min.y con pavimento                                                |||
                        |                                                                              |||
                        V                                                                              ||| 
            rende il modello visibile                                                                  |||
                        |                                                                              |||
                        V                                                                              |||
                rende modello visibile                                                                 |||
                        |                                                                              |||
                        V                                                                              |||
                hasPlaceModel=true                                                                     |||
                       |||                                                                             |||
                       |||                                                                             |||
                       ===================================================================================
                                                               |||
                                                               |||
                                                             USCITA AR
                                                                |
                                                                V
                                                    utente termina sessione
                                                                |
                                                                V
                                                    renderer.cr emette "sessioned"
                                                                |
                                                                V
                                                          onSessionEnd()
                                                                |
                                                                V
                                                              stop()
                                                                |
                                                                V
                                        resetta tutto e rende modello visibile nel viewer normale 