const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const STORE_DIR = path.join(__dirname, 'storage');
const TTL_MS = Number(process.env.UPLOAD_TTL_MS || 30 * 60 * 1000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 80 * 1024 * 1024);
const HTTPS_KEY_PATH = String(process.env.HTTPS_KEY_PATH || '').trim();
const HTTPS_CERT_PATH = String(process.env.HTTPS_CERT_PATH || '').trim();
const HTTPS_CA_PATH = String(process.env.HTTPS_CA_PATH || '').trim();
const HTTPS_PASSPHRASE = String(process.env.HTTPS_PASSPHRASE || '');
const HTTPS_ONLY = String(process.env.HTTPS_ONLY || 'false').toLowerCase() === 'true';
const TEXTURES_DIR = path.join(__dirname, '..', 'public', 'texture');


app.use(express.json({ limit: MAX_BODY_BYTES }));
app.use('/textures', express.static(TEXTURES_DIR));



app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});





app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});




app.post('/api/uploads', async (req, res, next) => {
  try {
    const body = req.body || {};

    const glbBase64 = stripDataUrlPrefix(body.glbBase64);
    const jsonBase64 = stripDataUrlPrefix(body.jsonBase64);

    if (!glbBase64 || !jsonBase64) {
      res.status(400).json({
        error: 'Campi richiesti mancanti: glbBase64 e jsonBase64'
      });
      return;
    }

    const glbBuffer = Buffer.from(glbBase64, 'base64');
    const jsonBuffer = Buffer.from(jsonBase64, 'base64');

    if (!glbBuffer.length || !jsonBuffer.length) {
      res.status(400).json({ error: 'File vuoti o base64 non valido' });
      return;
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = getExpirationIso();

    const dir = uploadDirFromId(id);
    const glbFilePath = path.join(dir, 'model.glb');
    const jsonFilePath = path.join(dir, 'config.json');

    const glbName = sanitizeFilename(body.glbName, 'model.glb');
    const jsonName = sanitizeFilename(body.jsonName, 'config.json');
    const glbMime = String(body.glbMime || 'model/gltf-binary');
    const jsonMime = String(body.jsonMime || 'application/json');

    await fsp.mkdir(dir, { recursive: true });

    await Promise.all([
      fsp.writeFile(glbFilePath, glbBuffer),
      fsp.writeFile(jsonFilePath, jsonBuffer)
    ]);

    const meta = {
      id,
      createdAt,
      expiresAt,
      glb: {
        storedAs: 'model.glb',
        originalName: glbName,
        mime: glbMime,
        size: glbBuffer.length
      },
      json: {
        storedAs: 'config.json',
        originalName: jsonName,
        mime: jsonMime,
        size: jsonBuffer.length
      }
    };

    await fsp.writeFile(metaPathFromId(id), JSON.stringify(meta, null, 2), 'utf8');
    res.status(201).json(buildPayloadResponse(req, meta));
  } catch (err) {
    next(err);
  }
});

app.post('/api/upload', async (req, res, next) => {
  try{
    const body = req.body || {};

    const glbBase64 = stripDataUrlPrefix(body.glbBase64);

    if(!glbBase64){
      res.status(400).json({
        error: 'Campo richiesto mancante: glbBase64'
      });
      return;
    }

    const glbBuffer = Buffer.from(glbBase64, 'base64');

    if(!glbBuffer.length){
      res.status(400).json({ error: 'File vuoto o base64 non valido'});
      return;
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = getExpirationIso();

    const dir = uploadDirFromId(id);
    const glbFilePath = path.join(dir, 'model.glb');

    const glbName = sanitizeFilename(body.glbName, 'model.glb');
    const glbMime = String(body.glbMime || 'model/gltf-binary');

    await fsp.mkdir(dir, { recursive: true});

    await Promise.all([
      fsp.writeFile(glbFilePath, glbBuffer)
    ]);

    const meta = {
      id,
      createdAt,
      expiresAt,
      glb:{
        storedAs: 'model.glb',
        originalName: glbName,
        mime: glbMime,
        size: glbBuffer.length
      }
    };

    await fsp.writeFile(metaPathFromId(id), JSON.stringify(meta, null, 2), 'utf8');
    res.status(201).json(buildPayloadResponseGlb(req, meta));

  }catch(err){
    next(err);
  }
})








app.get('/api/uploads/:id', async (req, res, next) => {
  try {
    const meta = await loadMetaOrNull(req.params.id);
    if (!meta) {
      res.status(404).json({ error: 'Upload non trovato' });
      return;
    }

    res.json(buildPayloadResponse(req, meta));
  } catch (err) {
    next(err);
  }
});




app.get('/api/uploads/:id/glb', async (req, res, next) => {
  try {
    const meta = await loadMetaOrNull(req.params.id);
    if (!meta) {
      res.status(404).json({ error: 'Upload non trovato' });
      return;
    }

    const filePath = path.join(uploadDirFromId(req.params.id), meta.glb.storedAs);
    streamFile(res, filePath, meta.glb.mime, meta.glb.originalName, meta.glb.size);
  } catch (err) {
    next(err);
  }
});



app.get('/api/uploads/:id/json', async (req, res, next) => {
  try {
    const meta = await loadMetaOrNull(req.params.id);
    if (!meta) {
      res.status(404).json({ error: 'Upload non trovato' });
      return;
    }

    const filePath = path.join(uploadDirFromId(req.params.id), meta.json.storedAs);
    streamFile(res, filePath, meta.json.mime, meta.json.originalName, meta.json.size);
  } catch (err) {
    next(err);
  }
});



app.delete('/api/uploads/:id', async (req, res, next) => {
  try {
    await deleteUpload(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});



app.get('/api/textures', async (req, res, next) => {
  try {
    const entries = await fsp.readdir(TEXTURES_DIR, { withFileTypes: true });

    const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    const textures = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => allowedExt.has(path.extname(fileName).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map((fileName) => ({
        name: prettifyTextureName(fileName),
        preview: `/textures/${encodeURIComponent(fileName)}`,
        value: `texture/${encodeURIComponent(fileName)}`,
        type: 'texture'
      }));

    res.json(textures);
  } catch (err) {
    next(err);
  }
});




app.use((req, res) => {
  res.status(404).json({ error: 'Route non trovata' });
});




app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Body JSON non valido' });
    return;
  }

  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload troppo grande' });
    return;
  }

  const statusCode = err?.statusCode || 500;
  res.status(statusCode).json({ error: err?.message || 'Errore interno server' });
});
















function sanitizeFilename(filename, fallback) {
  const base = path.basename(String(filename || fallback));
  const safe = base.replace(/[^\w.-]/g, '_');
  return safe || fallback;
}




function stripDataUrlPrefix(value) {
  if (typeof value !== 'string') return '';
  if (!value.startsWith('data:')) return value;
  const idx = value.indexOf(',');
  return idx >= 0 ? value.slice(idx + 1) : '';
}



function getExpirationIso() {
  return new Date(Date.now() + TTL_MS).toISOString();
}



function uploadDirFromId(id) {
  return path.join(STORE_DIR, id);
}




function metaPathFromId(id) {
  return path.join(uploadDirFromId(id), 'meta.json');
}





function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}





function buildPayloadResponse(req, meta) {
  const base = getBaseUrl(req);
  return {
    id: meta.id,
    createdAt: meta.createdAt,
    expiresAt: meta.expiresAt,
    glbUrl: `${base}/api/uploads/${meta.id}/glb`,
    jsonUrl: `${base}/api/uploads/${meta.id}/json`
  };
}


function buildPayloadResponseGlb(req, meta){
  const base = getBaseUrl(req);

  return{
    id: meta.id,
    createdAt: meta.createdAt,
    expiresAt: meta.expiresAt,
    glbUrl: `${base}/api/uploads/${meta.id}/glb`
  };
}



function isExpired(expiresAt) {
  return Date.now() > new Date(expiresAt).getTime();
}




async function ensureStoreDir() {
  await fsp.mkdir(STORE_DIR, { recursive: true });
}




async function readUploadMeta(id) {
  const raw = await fsp.readFile(metaPathFromId(id), 'utf8');
  return JSON.parse(raw);
}




async function deleteUpload(id) {
  await fsp.rm(uploadDirFromId(id), { recursive: true, force: true });
}






async function loadMetaOrNull(id) {
  try {
    const meta = await readUploadMeta(id);
    if (isExpired(meta.expiresAt)) {
      await deleteUpload(id);
      return null;
    }
    return meta;
  } catch {
    return null;
  }
}






async function cleanupExpiredUploads() {
  let entries;

  try {
    entries = await fsp.readdir(STORE_DIR, { withFileTypes: true });
  } catch {
    return;
  }

  const now = Date.now();

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          const meta = await readUploadMeta(entry.name);
          const exp = new Date(meta.expiresAt).getTime();
          if (Number.isFinite(exp) && exp <= now) {
            await deleteUpload(entry.name);
          }
        } catch {
          await deleteUpload(entry.name);
        }
      })
  );
}






function streamFile(res, filePath, mime, filename, size) {
  const encodedName = String(filename || '').replace(/"/g, '');

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', String(size));
  res.setHeader('Content-Disposition', `inline; filename="${encodedName}"`);

  const rs = fs.createReadStream(filePath);

  rs.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Errore streaming file' });
    } else {
      res.destroy();
    }
  });

  rs.pipe(res);
}


async function createHttpServer() {
  const hasKey = Boolean(HTTPS_KEY_PATH);
  const hasCert = Boolean(HTTPS_CERT_PATH);

  if (hasKey !== hasCert) {
    throw new Error('Configurazione HTTPS non valida: imposta sia HTTPS_KEY_PATH che HTTPS_CERT_PATH');
  }

  if (!hasKey && !hasCert) {
    if (HTTPS_ONLY) {
      throw new Error('HTTPS_ONLY=true ma mancano HTTPS_KEY_PATH e HTTPS_CERT_PATH');
    }

    return {
      protocol: 'http',
      server: http.createServer(app)
    };
  }

  const keyPath = path.resolve(process.cwd(), HTTPS_KEY_PATH);
  const certPath = path.resolve(process.cwd(), HTTPS_CERT_PATH);
  const caPath = HTTPS_CA_PATH ? path.resolve(process.cwd(), HTTPS_CA_PATH) : '';

  const [key, cert, ca] = await Promise.all([
    fsp.readFile(keyPath),
    fsp.readFile(certPath),
    caPath ? fsp.readFile(caPath) : Promise.resolve(undefined)
  ]);

  const tlsOptions = { key, cert };
  if (ca) tlsOptions.ca = ca;
  if (HTTPS_PASSPHRASE) tlsOptions.passphrase = HTTPS_PASSPHRASE;

  return {
    protocol: 'https',
    server: https.createServer(tlsOptions, app)
  };
}



function prettifyTextureName(fileName) {
  const base = path.parse(fileName).name;
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}











async function main() {
  await ensureStoreDir();
  await cleanupExpiredUploads();

  setInterval(() => {
    cleanupExpiredUploads().catch((err) => {
      console.error('[cleanup]', err);
    });
  }, 5 * 60 * 1000).unref();

  const { protocol, server } = await createHttpServer();

  server.listen(PORT, HOST, () => {
    console.log(`[backend] listening on ${protocol}://${HOST}:${PORT}`);
  });
}



main().catch((err) => {
  console.error('[startup]', err);
  process.exit(1);
});
