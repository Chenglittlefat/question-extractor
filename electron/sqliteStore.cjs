const fs = require('node:fs')
const path = require('node:path')
const initSqlJs = require('sql.js')

const schema = `
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`

class SqliteStore {
  constructor(userDataPath) {
    this.userDataPath = userDataPath
    this.dbPath = path.join(userDataPath, 'question-extractor.sqlite')
    this.db = null
    this.SQL = null
  }

  async init() {
    fs.mkdirSync(this.userDataPath, { recursive: true })
    const devWasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    const packagedWasmPath = process.resourcesPath
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
      : ''
    const wasmPath = fs.existsSync(packagedWasmPath) ? packagedWasmPath : devWasmPath
    this.SQL = await initSqlJs({ locateFile: () => wasmPath })
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath)
      this.db = new this.SQL.Database(fileBuffer)
    } else {
      this.db = new this.SQL.Database()
    }
    this.db.run(schema)
    this.persist()
  }

  getJson(key, fallback) {
    this.assertReady()
    const statement = this.db.prepare('SELECT value FROM app_state WHERE key = ? LIMIT 1')
    statement.bind([key])
    const row = statement.step() ? statement.getAsObject() : null
    statement.free()
    if (!row) return fallback
    try {
      return JSON.parse(String(row.value))
    } catch {
      return fallback
    }
  }

  setJson(key, value) {
    this.assertReady()
    this.db.run(
      `INSERT INTO app_state (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, JSON.stringify(value), new Date().toISOString()],
    )
    this.persist()
  }

  persist() {
    this.assertReady()
    const data = this.db.export()
    const tempPath = `${this.dbPath}.tmp`
    fs.writeFileSync(tempPath, Buffer.from(data))
    fs.renameSync(tempPath, this.dbPath)
  }

  assertReady() {
    if (!this.db) {
      throw new Error('SQLite store has not been initialized')
    }
  }
}

module.exports = { SqliteStore }
