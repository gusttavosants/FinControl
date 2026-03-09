import redis
import json
import os
from typing import Any, Optional, Callable
from functools import wraps
from core.logging import logger

# Redis connection
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info("Redis connected successfully")
except Exception as e:
    logger.warning(f"Redis not available, using in-memory cache: {str(e)}")
    redis_client = None

# In-memory fallback cache
_memory_cache = {}

class Cache:
    """Cache wrapper with Redis and in-memory fallback"""
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            if redis_client:
                value = redis_client.get(key)
                return json.loads(value) if value else None
            else:
                return _memory_cache.get(key)
        except Exception as e:
            logger.error(f"Cache get error: {str(e)}")
            return None
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL (seconds)"""
        try:
            serialized = json.dumps(value)
            if redis_client:
                redis_client.setex(key, ttl, serialized)
            else:
                _memory_cache[key] = value
                # Simple TTL cleanup for memory cache (not perfect but works)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {str(e)}")
            return False
    
    @staticmethod
    def delete(key: str) -> bool:
        """Delete key from cache"""
        try:
            if redis_client:
                redis_client.delete(key)
            else:
                _memory_cache.pop(key, None)
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {str(e)}")
            return False
    
    @staticmethod
    def clear_pattern(pattern: str) -> int:
        """Clear all keys matching pattern"""
        try:
            if redis_client:
                keys = redis_client.keys(pattern)
                if keys:
                    return redis_client.delete(*keys)
            else:
                # Simple pattern matching for memory cache
                keys_to_delete = [k for k in _memory_cache.keys() if pattern.replace("*", "") in k]
                for k in keys_to_delete:
                    del _memory_cache[k]
                return len(keys_to_delete)
            return 0
        except Exception as e:
            logger.error(f"Cache clear error: {str(e)}")
            return 0

def cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results
    Usage: @cache_result(ttl=600, key_prefix="dashboard")
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{key_prefix}:{func.__name__}"
            
            # Add user_id to key if present
            if args and hasattr(args[0], 'id'):
                cache_key += f":user_{args[0].id}"
            
            # Add other args to key
            if len(args) > 1:
                cache_key += f":{':'.join(str(arg) for arg in args[1:])}"
            
            if kwargs:
                cache_key += f":{':'.join(f'{k}={v}' for k, v in sorted(kwargs.items()))}"
            
            # Try to get from cache
            cached_value = Cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_value
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            Cache.set(cache_key, result, ttl)
            logger.debug(f"Cache miss: {cache_key}")
            
            return result
        return wrapper
    return decorator

def invalidate_user_cache(user_id: int):
    """Invalidate all cache entries for a user"""
    Cache.clear_pattern(f"*:user_{user_id}*")
    logger.info(f"Cache invalidated for user {user_id}")
