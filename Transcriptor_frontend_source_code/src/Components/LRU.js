import localforage from 'localforage'

class LRU {
  constructor(size) {
    this.size = size
  }

  async init() {
    const res = await localforage.getItem('audio-blob-cache')

    if (res) {
      this.cache = res.cache
      this.cacheMap = res.cacheMap
      this.store = res.store
    } else {
      this.cache = [] // list of keys in cache
      this.cacheMap = new Map() // key -> index in cache mapping
      this.store = new Map() // key -> value mapping
    }
  }

  updateCacheMap() {
    this.cache.forEach((key, idx) => this.cacheMap.set(key, idx))
  }

  async put(key, value) {
    try {
      if (!this.store.has(key)) {
        if (this.cache.length === this.size) {
          /*
                        evict a key by LRU policy
                    */
          const lastKey = this.cache.pop()
          this.cacheMap.delete(lastKey)
          this.store.delete(lastKey)
        }

        this.store.set(key, value)
        this.cache = [key, ...this.cache]

        this.updateCacheMap()

        await localforage.setItem('audio-blob-cache', {
          cache: this.cache,
          cacheMap: this.cacheMap,
          store: this.store,
        })
      }
    } catch (e) {
      return Promise.reject(e)
    }
  }

  async get(key) {
    try {
      if (this.store.has(key)) {
        const idxInCache = this.cacheMap.get(key)
        this.cache.splice(idxInCache, 1)

        this.cache = [key, ...this.cache]
        this.updateCacheMap()

        await localforage.setItem('audio-blob-cache', {
          cache: this.cache,
          cacheMap: this.cacheMap,
          store: this.store,
        })

        return this.store.get(key)
      } else {
        throw new Error(`Couldn't find key ${key}`)
      }
    } catch (e) {
      return Promise.reject(e)
    }
  }

  has(key) {
    if (this.store) {
      return this.store.has(key)
    } else {
      return false
    }
  }
}

export default LRU
