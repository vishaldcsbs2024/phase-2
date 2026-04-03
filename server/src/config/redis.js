// In-memory cache implementation (replaces Redis)
const cache = new Map();
const expirations = new Map();

console.log('✓ Cache service initialized (in-memory)');

const get = async (key) => {
  try {
    // Check if key has expired
    if (expirations.has(key)) {
      const expiryTime = expirations.get(key);
      if (Date.now() > expiryTime) {
        cache.delete(key);
        expirations.delete(key);
        return null;
      }
    }
    
    const value = cache.get(key);
    return value ? value : null;
  } catch (error) {
    console.error('Error getting from cache:', error.message);
    return null;
  }
};

const set = async (key, value, ttl = 3600) => {
  try {
    cache.set(key, value);
    
    // Set expiration time if TTL is specified
    if (ttl > 0) {
      expirations.set(key, Date.now() + ttl * 1000);
    }
    
    return true;
  } catch (error) {
    console.error('Error setting in cache:', error.message);
    return false;
  }
};

const del = async (key) => {
  try {
    cache.delete(key);
    expirations.delete(key);
    return true;
  } catch (error) {
    console.error('Error deleting from cache:', error.message);
    return false;
  }
};

const incr = async (key) => {
  try {
    const current = cache.get(key) || 0;
    const newValue = current + 1;
    cache.set(key, newValue);
    return newValue;
  } catch (error) {
    console.error('Error incrementing in cache:', error.message);
    return 0;
  }
};

module.exports = { get, set, del, incr };
