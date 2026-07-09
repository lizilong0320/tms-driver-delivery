// In-memory store with GitHub Gist persistence (free, public Gist API)
// Falls back to /tmp file when no token configured
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';

declare global { var __tms_db: any; }
declare global { var __tms_db_loaded: boolean; }

// GitHub Gist config (free, requires just a Personal Access Token)
const GIST_TOKEN = process.env.TMS_GIST_TOKEN || '';
const GIST_ID = process.env.TMS_GIST_ID || ''; // Existing Gist ID for the DB
const GIST_FILE_NAME = 'tms-db.json';
const REMOTE_ENABLED = !!GIST_TOKEN && !!GIST_ID;
const TMP_DB_PATH = process.env.TMS_TMP_DB || '/tmp/tms-db.json';

let db = globalThis.__tms_db;
let dbLoaded = globalThis.__tms_db_loaded;

// Initialize default data (offline fallback)
function initDB() {
  const hash = bcrypt.hashSync('123456', 10);
  const now = new Date().toISOString();
  return {
    users: [
      { id: 1, phone: 'admin', name: '管理员', password: hash, role: 'admin', status: 1, createdAt: now },
      { id: 2, phone: '13900010001', name: '张师傅', password: hash, role: 'driver', status: 1, createdAt: now },
      { id: 3, phone: '13900010002', name: '刘师傅', password: hash, role: 'driver', status: 1, createdAt: now },
    ],
    drivers: [
      { id: 1, userId: 1, plateNo: null, vehicleType: null, status: 1, idCard: null },
      { id: 2, userId: 2, plateNo: '沪A12345', vehicleType: '4.2米冷藏车', status: 1, idCard: null },
    ],
    shippers: [
      { id: 1, name: '蒙牛乳业', contact: null, phone: '400-123-4567', address: null, createdAt: now },
      { id: 2, name: '双汇食品', contact: null, phone: '400-765-4321', address: null, createdAt: now },
    ],
    warehouses: [
      { id: 1, name: '长沙雨花仓', address: '长沙市雨花区万家丽路', city: '长沙', createdAt: now },
      { id: 2, name: '长沙星沙仓', address: '长沙市星沙经济开发区', city: '长沙', createdAt: now },
    ],
    waybills: [
      { id: 1, waybillNo: 'WB001', warehouseId: 1, shipperId: 1, receiverName: '张三商超', receiverPhone: '13900139001', receiverAddress: '雨花区韶山南路1号', receiverLng: 113.038, receiverLat: 28.137, temperatureLayer: '冷藏', weight: 50, itemType: '乳制品', packageCount: 10, deadline: null, codAmount: null, remark: null, status: 0, batchId: null, sortOrder: null, signTime: null, signType: null, signerName: null, signImage: null, signLocation: null, exceptionType: null, exceptionDesc: null, exceptionImages: null, createdAt: now, updatedAt: now },
      { id: 2, waybillNo: 'WB002', warehouseId: 1, shipperId: 1, receiverName: '李四便利店', receiverPhone: '13900139002', receiverAddress: '雨花区湘府路2号', receiverLng: 113.052, receiverLat: 28.125, temperatureLayer: '冷藏', weight: 30, itemType: '酸奶', packageCount: 6, deadline: null, codAmount: null, remark: null, status: 0, batchId: null, sortOrder: null, signTime: null, signType: null, signerName: null, signImage: null, signLocation: null, exceptionType: null, exceptionDesc: null, exceptionImages: null, createdAt: now, updatedAt: now },
      { id: 3, waybillNo: 'WB003', warehouseId: 2, shipperId: 2, receiverName: '王五超市', receiverPhone: '13900139003', receiverAddress: '星沙区板仓路3号', receiverLng: 113.075, receiverLat: 28.245, temperatureLayer: '冷冻', weight: 80, itemType: '冷冻肉', packageCount: 15, deadline: null, codAmount: null, remark: null, status: 0, batchId: null, sortOrder: null, signTime: null, signType: null, signerName: null, signImage: null, signLocation: null, exceptionType: null, exceptionDesc: null, exceptionImages: null, createdAt: now, updatedAt: now },
      { id: 4, waybillNo: 'WB004', warehouseId: 1, shipperId: 2, receiverName: '赵六餐饮', receiverPhone: '13900139004', receiverAddress: '雨花区万家丽路4号', receiverLng: 113.028, receiverLat: 28.152, temperatureLayer: '常温', weight: 20, itemType: '调味品', packageCount: 5, deadline: null, codAmount: null, remark: null, status: 0, batchId: null, sortOrder: null, signTime: null, signType: null, signerName: null, signImage: null, signLocation: null, exceptionType: null, exceptionDesc: null, exceptionImages: null, createdAt: now, updatedAt: now },
      { id: 5, waybillNo: 'WB005', warehouseId: 1, shipperId: 1, receiverName: '孙七生鲜', receiverPhone: '13900139005', receiverAddress: '雨花区劳动路5号', receiverLng: 113.045, receiverLat: 28.145, temperatureLayer: '冷藏', weight: 45, itemType: '鲜奶', packageCount: 8, deadline: null, codAmount: null, remark: null, status: 0, batchId: null, sortOrder: null, signTime: null, signType: null, signerName: null, signImage: null, signLocation: null, exceptionType: null, exceptionDesc: null, exceptionImages: null, createdAt: now, updatedAt: now },
    ],
    batches: [] as any[],
    nextId: { user: 3, driver: 3, shipper: 3, warehouse: 3, waybill: 6, batch: 1 },
  };
}

if (!db) {
  db = initDB();
  globalThis.__tms_db = db;
}

function nextId(table: string) {
  const id = db.nextId[table] || 1;
  db.nextId[table] = id + 1;
  return id;
}

// ========== Persistence layer ==========
let saveTimer: any = null;

async function loadFromStorage() {
  if (dbLoaded) return;
  try {
    let remote: any = null;
    if (REMOTE_ENABLED) {
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: { Authorization: `token ${GIST_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (res.ok) {
        const json = await res.json();
        const file = json.files[GIST_FILE_NAME];
        if (file && file.content) {
          remote = JSON.parse(file.content);
        }
      } else {
        console.log('Gist load failed:', res.status);
      }
    } else {
      // Try multiple /tmp paths
      for (const p of [TMP_DB_PATH, '/tmp/tms-db-fallback.json', '/tmp/tms-db.json']) {
        try {
          const txt = await fs.readFile(p, 'utf-8');
          remote = JSON.parse(txt);
          console.log(`Loaded from ${p}`);
          break;
        } catch {}
      }
    }
    if (remote && remote.users && remote.waybills) {
      db = { ...initDB(), ...remote };
      globalThis.__tms_db = db;
      console.log(`Loaded from ${REMOTE_ENABLED ? 'Gist' : '/tmp'}`);
    } else {
      console.log(`No remote DB, using initial data`);
    }
  } catch (e: any) {
    console.log('Load error:', e?.message);
  }
  dbLoaded = true;
  globalThis.__tms_db_loaded = true;
}

function saveToStorage() {
  // Fire-and-forget save (no debounce) for stronger durability
  (async () => {
    try {
      if (REMOTE_ENABLED) {
        const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
          method: 'PATCH',
          headers: { Authorization: `token ${GIST_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: { [GIST_FILE_NAME]: { content: JSON.stringify(db) } },
          }),
        });
        if (res.ok) console.log('Saved to Gist');
        else console.log('Gist save failed:', res.status, (await res.text()).substring(0, 200));
      } else {
        // Write to /tmp - Vercel keeps /tmp alive during warm Lambda invocations
        await fs.writeFile(TMP_DB_PATH, JSON.stringify(db), 'utf-8');
        // Also write to a fallback location
        await fs.writeFile('/tmp/tms-db-fallback.json', JSON.stringify(db), 'utf-8');
      }
    } catch (e) {
      console.log('Save error:', e);
    }
  })();
}

export async function ensureLoaded() {
  if (!dbLoaded) {
    await loadFromStorage();
  }
}

export function persist() {
  saveToStorage();
}

// Export a getter so consumers always get current ref
export function getDb() {
  return db;
}

// Relation resolver - mutates input object in place
function resolveIncludes(obj: any, include: any): any {
  if (!include || !obj) return obj;
  if (include.warehouse) obj.warehouse = db.warebills && db.warehouses ? (db.warehouses.find((w: any) => w.id === obj.warehouseId) || null) : null;
  if (include.shipper) obj.shipper = db.shippers ? (db.shippers.find((s: any) => s.id === obj.shipperId) || null) : null;
  if (include.batch) {
    const batch = db.batches.find((b: any) => b.id === obj.batchId);
    if (batch) {
      obj.batch = { ...batch, _count: { waybills: db.waybills.filter((w: any) => w.batchId === batch.id).length } };
      if (include.batch.include?.driver) {
        const driver = db.drivers.find((d: any) => d.id === batch.driverId);
        if (driver) {
          obj.batch.driver = { ...driver };
          if (include.batch.include.driver.include?.user) {
            obj.batch.driver.user = db.users.find((u: any) => u.id === driver.userId) || null;
          }
        }
      }
      if (include.batch.include?.waybills) {
        obj.batch.waybills = db.waybills.filter((w: any) => w.batchId === batch.id);
      }
    } else {
      obj.batch = null;
    }
  }
  if (include.user) obj.user = db.users.find((u: any) => u.id === obj.userId) || null;
  if (include.waybills) {
    obj.waybills = db.waybills
      .filter((w: any) => w.batchId === obj.id)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (include.waybills.include) {
      obj.waybills = obj.waybills.map((w: any) => resolveIncludes(w, include.waybills.include));
    }
  }
  if (include.batches) {
    obj.batches = db.batches
      .filter((b: any) => b.driverId === obj.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (include.batches.include) {
      obj.batches = obj.batches.map((b: any) => resolveIncludes(b, include.batches.include));
    }
  }
  return obj;
}

export const prisma = {
  // Auto-persist wrapper
  _persist: () => persist(),
  user: {
    findMany: (args?: any) => {
      let list = [...db.users];
      if (args?.where) {
        const w = args.where;
        if (w.phone) list = list.filter((u: any) => u.phone === w.phone);
        if (w.role) list = list.filter((u: any) => u.role === w.role);
        if (w.id) list = list.filter((u: any) => u.id === w.id);
      }
      if (args?.include) list.forEach((u: any) => resolveIncludes(u, args.include));
      return list;
    },
    findUnique: (args: any) => {
      const w = args.where || {};
      let u: any = null;
      if (w.id) u = db.users.find((u: any) => u.id === w.id) || null;
      else if (w.phone) u = db.users.find((u: any) => u.phone === w.phone) || null;
      if (u && args?.include) u = resolveIncludes(u, args.include);
      return u;
    },
    findFirst: (args?: any) => {
      const w = args?.where || {};
      if (w.role === 'admin') return db.users.find((u: any) => u.role === 'admin') || null;
      return db.users[0] || null;
    },
    create: (args: any) => {
      const u = { id: nextId('user'), ...args.data, createdAt: new Date().toISOString() };
      db.users.push(u);
      persist();
      return args?.include ? resolveIncludes(u, args.include) : u;
    },
    update: (args: any) => {
      const u = db.users.find((u: any) => u.id === args.where.id);
      if (!u) throw new Error('User not found');
      Object.assign(u, args.data);
      persist();
      return u;
    },
    upsert: (args: any) => {
      const existing = db.users.find((u: any) => {
        if (args.where.id) return u.id === args.where.id;
        if (args.where.phone) return u.phone === args.where.phone;
        if (args.where.role === 'admin') return u.role === 'admin';
        return false;
      });
      if (existing) { Object.assign(existing, args.update); persist(); return existing; }
      const u = { id: nextId('user'), ...args.create, createdAt: new Date().toISOString() };
      db.users.push(u); persist(); return u;
    },
  },
  shipper: {
    findMany: (args?: any) => {
      const list = [...db.shippers];
      if (args?.include) list.forEach((s: any) => resolveIncludes(s, args.include));
      return list;
    },
    findUnique: (args: any) => {
      const { id, name } = args.where || {};
      let s: any = null;
      if (id) s = db.shippers.find((s: any) => s.id === id) || null;
      if (name) s = db.shippers.find((s: any) => s.name === name) || null;
      if (s && args?.include) s = resolveIncludes(s, args.include);
      return s;
    },
    upsert: (args: any) => {
      const existing = db.shippers.find((s: any) => s.name === args.where.name);
      if (existing) { Object.assign(existing, args.update); persist(); return existing; }
      const s = { id: nextId('shipper'), ...args.create, createdAt: new Date().toISOString() };
      db.shippers.push(s); persist(); return s;
    },
    findFirst: () => db.shippers[0] || null,
    count: () => db.shippers.length,
    create: (args: any) => {
      const s = { id: nextId('shipper'), ...args.data, createdAt: new Date().toISOString() };
      db.shippers.push(s); persist(); return s;
    },
  },
  warehouse: {
    findMany: (args?: any) => {
      const list = [...db.warehouses];
      if (args?.include) list.forEach((w: any) => resolveIncludes(w, args.include));
      return list;
    },
    findUnique: (args: any) => {
      const { id, name } = args.where || {};
      let w: any = null;
      if (id) w = db.warehouses.find((w: any) => w.id === id) || null;
      if (name) w = db.warehouses.find((w: any) => w.name === name) || null;
      if (w && args?.include) w = resolveIncludes(w, args.include);
      return w;
    },
    upsert: (args: any) => {
      const existing = db.warehouses.find((w: any) => w.name === args.where.name);
      if (existing) { Object.assign(existing, args.update); persist(); return existing; }
      const w = { id: nextId('warehouse'), ...args.create, createdAt: new Date().toISOString() };
      db.warehouses.push(w); persist(); return w;
    },
    create: (args: any) => {
      const w = { id: nextId('warehouse'), ...args.data, createdAt: new Date().toISOString() };
      db.warehouses.push(w); persist(); return w;
    },
    findFirst: () => db.warehouses[0] || null,
    count: () => db.warehouses.length,
  },
  driver: {
    findMany: (args?: any) => {
      let list = [...db.drivers];
      const where = args?.where || {};
      if (where.status !== undefined) list = list.filter((d: any) => d.status === where.status);
      list.sort((a: any, b: any) => b.id - a.id);
      if (args?.include) list.forEach((d: any) => resolveIncludes(d, args.include));
      return list;
    },
    findUnique: (args: any) => {
      const { id, userId } = args.where || {};
      let d: any = null;
      if (id) d = db.drivers.find((d: any) => d.id === id) || null;
      if (userId) d = db.drivers.find((d: any) => d.userId === userId) || null;
      if (d && args?.include) d = resolveIncludes(d, args.include);
      return d;
    },
    findFirst: (args?: any) => {
      const list = db.drivers;
      if (args?.where) {
        return list.find((d: any) => {
          for (const k of Object.keys(args.where)) {
            if (d[k] !== args.where[k]) return false;
          }
          return true;
        }) || null;
      }
      return list[0] || null;
    },
    create: (args: any) => {
      const d = { id: nextId('driver'), ...args.data };
      db.drivers.push(d);
      persist();
      return args?.include ? resolveIncludes(d, args.include) : d;
    },
    update: (args: any) => {
      const d = db.drivers.find((d: any) => d.id === args.where.id);
      if (!d) throw new Error('Driver not found');
      Object.assign(d, args.data);
      persist();
      return d;
    },
    upsert: (args: any) => {
      const existing = db.drivers.find((d: any) => args.where.id ? d.id === args.where.id : d.userId === args.where.userId);
      if (existing) { Object.assign(existing, args.update); persist(); return existing; }
      const d = { id: nextId('driver'), ...args.create };
      db.drivers.push(d); persist(); return d;
    },
  },
  waybill: {
    findMany: (args?: any) => {
      let list = [...db.waybills];
      const where = args?.where || {};
      if (where.status !== undefined && where.status !== null && where.status !== '') list = list.filter((w: any) => w.status === where.status);
      if (where.status?.in) list = list.filter((w: any) => where.status.in.includes(w.status));
      if (where.batchId !== undefined && where.batchId !== null) list = list.filter((w: any) => w.batchId === where.batchId);
      if (where.warehouseId) list = list.filter((w: any) => w.warehouseId === where.warehouseId);
      if (where.shipperId) list = list.filter((w: any) => w.shipperId === where.shipperId);
      if (where.temperatureLayer) list = list.filter((w: any) => w.temperatureLayer === where.temperatureLayer);
      if (where.OR) {
        list = list.filter((w: any) => where.OR.some((c: any) => {
          if (c.receiverName?.contains) return w.receiverName.includes(c.receiverName.contains);
          if (c.receiverPhone?.contains) return w.receiverPhone.includes(c.receiverPhone.contains);
          if (c.waybillNo?.contains) return w.waybillNo.includes(c.waybillNo.contains);
          return false;
        }));
      }
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const skip = (args?.skip) || 0;
      const take = (args?.take) || 20;
      const sliced = list.slice(skip, skip + take);
      if (args?.include) sliced.forEach((w: any) => resolveIncludes(w, args.include));
      return sliced;
    },
    findUnique: (args: any) => {
      const { id, waybillNo } = args.where || {};
      let w: any = null;
      if (id) w = db.waybills.find((w: any) => w.id === id) || null;
      if (waybillNo) w = db.waybills.find((w: any) => w.waybillNo === waybillNo) || null;
      if (w && args?.include) w = resolveIncludes(w, args.include);
      return w;
    },
    create: (args: any) => {
      const w = { id: nextId('waybill'), ...args.data, status: args.data.status ?? 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.waybills.push(w);
      persist();
      return args?.include ? resolveIncludes(w, args.include) : w;
    },
    update: (args: any) => {
      const w = db.waybills.find((w: any) => w.id === args.where.id);
      if (!w) throw new Error('Not found');
      Object.assign(w, args.data, { updatedAt: new Date().toISOString() });
      persist();
      return args?.include ? resolveIncludes(w, args.include) : w;
    },
    updateMany: (args: any) => {
      const filter = (w: any) => {
        if (args.where.id?.in) return args.where.id.in.includes(w.id);
        if (args.where.batchId) return w.batchId === args.where.batchId;
        if (args.where.status) return w.status === args.where.status;
        return true;
      };
      let count = 0;
      db.waybills.forEach((w: any) => { if (filter(w)) { Object.assign(w, args.data, { updatedAt: new Date().toISOString() }); count++; } });
      if (count > 0) persist();
      return { count };
    },
    count: (args?: any) => {
      let list = [...db.waybills];
      const where = args?.where || {};
      if (where.status !== undefined) list = list.filter((w: any) => w.status === where.status);
      if (where.status?.in) list = list.filter((w: any) => where.status.in.includes(w.status));
      return list.length;
    },
    delete: (args: any) => {
      const idx = db.waybills.findIndex((w: any) => w.id === args.where.id);
      if (idx >= 0) { db.waybills.splice(idx, 1); persist(); }
    },
    groupBy: (args: any) => {
      const map: Record<string, number> = {};
      db.waybills.forEach((w: any) => {
        const k = w[args.by[0]];
        if (k) map[k] = (map[k] || 0) + 1;
      });
      return Object.entries(map).map(([k, _count]) => ({ [args.by[0]]: k, _count }));
    },
  },
  batch: {
    findMany: (args?: any) => {
      let list = [...db.batches];
      const where = args?.where || {};
      if (where.driverId !== undefined) list = list.filter((b: any) => b.driverId === where.driverId);
      if (where.status !== undefined) {
        if (where.status?.in) list = list.filter((b: any) => where.status.in.includes(b.status));
        else list = list.filter((b: any) => b.status === where.status);
      }
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const skip = (args?.skip) || 0;
      const take = (args?.take) || 20;
      const sliced = list.slice(skip, skip + take);
      if (args?.include) sliced.forEach((b: any) => resolveIncludes(b, args.include));
      return sliced;
    },
    findUnique: (args: any) => {
      const b = db.batches.find((b: any) => b.id === args.where.id);
      if (!b) return null;
      const result: any = { ...b };
      if (args?.include?.waybills) {
        result.waybills = db.waybills.filter((w: any) => w.batchId === b.id).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }
      if (args?.include?.driver) {
        result.driver = db.drivers.find((d: any) => d.id === b.driverId) || null;
      }
      return result;
    },
    create: (args: any) => {
      const b = { id: nextId('batch'), ...args.data, status: args.data.status || 0, createdAt: new Date().toISOString() };
      db.batches.push(b);
      persist();
      return b;
    },
    update: (args: any) => {
      const b = db.batches.find((b: any) => b.id === args.where.id);
      if (!b) throw new Error('Batch not found');
      Object.assign(b, args.data);
      persist();
      return b;
    },
    count: (args?: any) => {
      let list = [...db.batches];
      const where = args?.where || {};
      if (where.status !== undefined) list = list.filter((b: any) => b.status === where.status);
      if (where.driverId) list = list.filter((b: any) => b.driverId === where.driverId);
      return list.length;
    },
  },
  exceptionRecord: {
    create: (args: any) => {
      const r = { id: nextId('batch'), ...args.data, createdAt: new Date().toISOString() };
      (db as any).exceptionRecords = (db as any).exceptionRecords || [];
      (db as any).exceptionRecords.push(r);
      persist();
      return r;
    },
  },
  signRecord: {
    create: (args: any) => {
      const r = { id: nextId('batch'), ...args.data, createdAt: new Date().toISOString() };
      (db as any).signRecords = (db as any).signRecords || [];
      (db as any).signRecords.push(r);
      persist();
      return r;
    },
  },
};
