Spiegazione completa, sezione per sezione:

Config iniziale
Importa moduli Node core (http, fs, fs/promises, path, crypto) per server, I/O file e UUID: server.js (line 1)
Legge variabili ambiente con fallback:
PORT, HOST, CORS_ORIGIN, STORE_DIR, TTL_MS, MAX_BODY_BYTES: server.js (line 10)


Utility HTTP/CORS
corsHeaders() definisce gli header CORS comuni per tutte le response: server.js (line 19)
sendJson() centralizza risposta JSON con status, content-type e content-length: server.js (line 28)



Utility di sicurezza e parsing input
sanitizeFilename() evita path traversal e caratteri strani nei nomi file: server.js (line 42)
stripDataUrlPrefix() supporta sia base64 puro sia data:...;base64,...: server.js (line 50)
readJsonBody() legge il body a chunk, applica limite dimensione (413) e parse JSON (400): server.js (line 75)



Utility storage
uploadDirFromId() e metaPathFromId() costruiscono i path su disco: server.js (line 113)
readUploadMeta() legge meta.json: server.js (line 123)
deleteUpload() elimina ricorsivamente una cartella upload: server.js (line 130)


Costruzione risposta pubblica
getBaseUrl() ricava protocollo+host dalla request (supporta proxy con x-forwarded-proto): server.js (line 136)
buildPayloadResponse() restituisce id, date e URL assoluti glbUrl/jsonUrl: server.js (line 143)



Upload (POST /api/uploads)
handleUpload() fa tutto il flusso:
legge body, valida campi, decodifica base64, genera UUID, salva model.glb + config.json, salva metadata, risponde 201: server.js (line 160)





TTL/scadenza upload
isExpired() controlla se expiresAt è passato: server.js (line 231)
loadMetaOr404() incapsula logica comune:
se scaduto cancella e ritorna 404, se mancante ritorna 404, altrimenti ritorna meta: server.js (line 239)



Download file
streamFile() apre stream dal filesystem e invia file con MIME e Content-Disposition: server.js (line 256)
handleDownload() seleziona GLB o JSON e delega a streamFile(): server.js (line 278)



Cleanup periodico storage
cleanupExpiredUploads() scansiona tutte le cartelle in storage, elimina scaduti o corrotti: server.js (line 299)



Router HTTP
handleRequest() gestisce tutte le route:
OPTIONS, GET /api/health, POST /api/uploads,
GET /api/uploads/:id/glb|json, GET /api/uploads/:id, DELETE /api/uploads/:id, altrimenti 404: server.js (line 332)



Avvio server
main() crea storage, fa cleanup iniziale, avvia cleanup ogni 5 minuti, crea http.createServer, ascolta su HOST:PORT: server.js (line 389)
Entry point con catch di startup e process.exit(1) su errore: server.js (line 415)


Flusso pratico in 6 passi:

Client fa POST /api/uploads con glbBase64 + jsonBase64.
Server salva file in backend/storage/<uuid>/.
Server salva meta.json con info file + scadenza.
Server risponde con id, glbUrl, jsonUrl, expiresAt.
Client scarica con GET /api/uploads/:id/glb e /json.
Cleanup automatico rimuove upload scaduti.



Nota operativa:

Ho modificato solo commenti, non la logica.
Il check node --check nel sandbox ha dato errore permessi (EPERM su C:\Users\checc), quindi non ho un parse-check automatico da tool in questa sessione.