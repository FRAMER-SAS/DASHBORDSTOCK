import XLSX from 'xlsx';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lookup: código → { rubro, proveedor, desc_full }
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

function parseStock(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Detect header row
  let hi = 0;
  for (let i = 0; i < Math.min(6, raw.length); i++) {
    const row = raw[i].map(c => String(c).toLowerCase());
    if (row.some(c => c.includes('cód') || c.includes('artículo') || c.includes('codigo'))) {
      hi = i; break;
    }
  }

  const headers = raw[hi].map((h) => {
    const hl = String(h).toLowerCase().trim();
    if (hl.includes('cód') || hl.includes('artículo') || hl.includes('codigo')) return 'codigo';
    if (hl.includes('desc')) return 'descripcion';
    if (hl.includes('med'))  return 'medida';
    if (hl.includes('pedido') && hl.includes('kit')) return 'ped_kit';
    if (hl.includes('pedido'))  return 'pedidos';
    if (hl.includes('compra') && hl.includes('kit')) return 'cpr_kit';
    if (hl.includes('compra'))  return 'compras';
    if (hl.includes('stock'))   return 'stock';
    return 'col';
  });

  const stockIdx = headers.reduce((acc, h, i) => h === 'stock' ? [...acc, i] : acc, []);
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };

  const lookup = getLookup();
  const data = [];

  for (let r = hi + 1; r < raw.length; r++) {
    const row = raw[r];
    const cod = String(row[0] || '').trim();
    if (!cod || cod.length < 3) continue;
    if (/impreso|hoja\s*nro/i.test(cod)) continue;

    const descIdx = headers.findIndex(h => h === 'descripcion');
    const medIdx  = headers.findIndex(h => h === 'medida');
    const pedIdx  = headers.findIndex(h => h === 'pedidos');

    const stock_actual = stockIdx.length > 0 ? num(row[stockIdx[0]])                         : 0;
    const stock_final  = stockIdx.length > 2 ? num(row[stockIdx[stockIdx.length - 1]])       :
                         stockIdx.length > 0 ? num(row[stockIdx[0]])                         : 0;
    const pedidos      = pedIdx >= 0 ? num(row[pedIdx]) : 0;

    const info = lookup[cod] || {};

    data.push({
      codigo:       cod,
      descripcion:  String(row[descIdx >= 0 ? descIdx : 1] || '').trim(),
      medida:       String(row[medIdx  >= 0 ? medIdx  : 2] || 'Unidad').trim(),
      stock_actual: Math.round(stock_actual * 100) / 100,
      pedidos:      Math.round(pedidos * 100) / 100,
      stock_final:  Math.round(stock_final * 100) / 100,
      rubro:        info.rubro     || '',
      proveedor:    info.proveedor || '',
      desc_full:    info.desc_full || '',
    });
  }

  return data;
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024 });

  form.parse(req, (err, _fields, files) => {
    if (err) return res.status(400).json({ error: 'Error al parsear el formulario: ' + err.message });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    try {
      const buffer = fs.readFileSync(file.filepath);
      const data   = parseStock(buffer);

      if (data.length < 3) {
        return res.status(422).json({ error: `Solo se leyeron ${data.length} registros. Verificá el formato del archivo.` });
      }

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({
        ok:      true,
        count:   data.length,
        updated: new Date().toISOString(),
        data,
      });
    } catch (ex) {
      res.status(500).json({ error: 'Error al procesar el Excel: ' + ex.message });
    }
  });
}
