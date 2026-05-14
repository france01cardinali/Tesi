# TODO

> Task list locale + GitHub. Le checkbox sono cliccabili in GitHub e nei viewer Markdown (VS Code, Obsidian).

---

## 🔥 PRIORITÀ ALTA

* [ ] Testare posizionamento su piano de features rotazione e pan
* [ ] Fix problemi che verranno dai test
* [ ] Implementare l'occlusione con depth-sensing
* [ ] Pulire e ottimizzare il codice 
---

## ⚙️ PRIORITÀ MEDIA

* [ ] Capine fino a dove arrivare con il progetto
---

## ✅ COMPLETATE
* [x] Refactoring del progetto
* [x] Fare HTML del nuovo index con l’inserimento delle varianti
* [x] Trovare il modo per passare il modello al model-viewer
* [x] Caricamento .glb e delle texture jpg/png
* [x] Fare html del nuovo index con l’inserimento delle varianti 
* [x] Trovare il modo per passare il modello al model-viewer 
* [x] Capire come fare più varianti per le varie mesh del modello
* [x] Caricamento .glb e delle texture jpg/png 
* [x] Sistemare il file unico
* [x] Capire come creare dinamicamente i select per le varianti
* [x] Ristrutturare il progetto
* [x] Rendere dinamica la creazione degli oggetti html per la manipolazione del glb
* [x] Capire come farmi aiutare da un file JSON per il passaggio di informazioni
* [x] Decidere quale approccio usare per le varianti delle varie mesh. Se mantenere le materials_variants scrivendole sul file .glb oppure se creare e cambiare i materiali a runtime
* [x] Fare un prototipo per l'opzione a runtime, divisione della task in sub-tasks:
* [x] Creazione classe di creazione materiale (da zero o da texture img)
* [x] Capire come gestire la cache 
* [x] Creare standard materiali su configurazione.json
* [x] Integrarlo a createSelect.js
* [x] Testare e decidere
* [*] Sistemare UI in AR (fix bug modello bloccato dopo uscita da AR)




---

## 📝 NOTE
* Le checkbox sono pienamente compatibili con GitHub.

---

## AGGIUNTE (NUOVE TASK ESTESE)


### P2 - Robustezza dati, sicurezza, coerenza codice

* [ ] P2.3 - Pulizia debug/test e naming incoerente.
Scopo: migliorare leggibilita e manutenzione.
Cosa fare: rimuovere hook test in produzione, uniformare nomi e correggere typo principali.
Done quando: codice produzione senza blocchi test temporanei e naming consistente.
File: `src/script/**`, `src/styles.css`, `src/index.html`.


