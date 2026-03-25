/*export async function initCrypto(client) {
  try {
    await client.initRustCrypto()
    console.log('✅ Rust Crypto initialisiert für', client.getUserId())
  } catch (e) {
    if (e.message?.includes("doesn't match")) {
      // ✅ Alter Crypto-Store passt nicht zur aktuellen deviceId → löschen
      console.warn('Crypto Store veraltet, lösche und initialisiere neu...')
      await clearCryptoStore(client.getUserId())
      await client.initRustCrypto()
      console.log('✅ Rust Crypto neu initialisiert nach Store-Reset')
    } else if (!e.message?.includes('already')) {
      console.error('Crypto Init Fehler:', e)
    }
  }
}
*/
export async function initCrypto(client) {
  try {
    await client.initRustCrypto()
    console.log('✅ Rust Crypto initialisiert für', client.getUserId())
  } catch (e) {
    if (e.message?.includes("doesn't match")) {
      await clearCryptoStore(client.getUserId())
      await client.initRustCrypto()
    } else if (!e.message?.includes('already')) {
      console.error('Crypto Init Fehler:', e)
    }
  }
}

async function clearCryptoStore(userId) {
  try {
    // IndexedDB Datenbanken die matrix-sdk-crypto-wasm anlegt löschen
    const dbs = await indexedDB.databases()
    for (const db of dbs) {
      if (db.name?.includes('matrix') || db.name?.includes('crypto')) {
        await new Promise((resolve, reject) => {
          const req = indexedDB.deleteDatabase(db.name)
          req.onsuccess = resolve
          req.onerror = reject
        })
        console.log('🗑 IndexedDB gelöscht:', db.name)
      }
    }
  } catch (e) {
    console.warn('Store löschen fehlgeschlagen:', e)
  }
}