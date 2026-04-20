import XLSX from 'xlsx';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _lookup = null;
function getLookup() {
  if (_lookup) return _lookup;
  try {
    const p = path.join(process.cwd(), 'data', 'lookup.json');
    _lookup = JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    _lookup = {};
  }
  return _lookup;
}

// ... (resto de parseStock igual) ...

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024 });

  form.parse(req, (err, _fields, files) => {
    if (err) return res.status(400).json({ error: 'Error al parsear: ' + err.message });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    try {
      const buffer = fs.readFileSync(file.filepath);
      const data = parseStock(buffer);

      if (data.length < 3) {
        return res.status(422).json({ error: `Solo se leyeron ${data.length} registros.` });
      }

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ ok: true, count: data.length, updated: new Date().toISOString(), data });
    } catch (ex) {
      res.status(500).json({ error: 'Error al procesar el Excel: ' + ex.message });
    }
  });
}
