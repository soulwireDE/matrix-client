// services/cryptoStore.js
import { IndexedDBCryptoStore } from 'matrix-js-sdk/lib/crypto/store/indexeddb-crypto-store'

export function createCryptoStore(userId) {
  // Jeder User bekommt seine eigene DB
  return new IndexedDBCryptoStore(
    IndexedDBCryptoStore.STORE_NAME,
    `matrix-crypto-${userId}`
  )
}