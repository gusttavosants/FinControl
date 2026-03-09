from fastapi import HTTPException, Request
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Tuple

class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = defaultdict(list)
    
    def check_rate_limit(self, identifier: str) -> Tuple[bool, int]:
        """
        Check if request should be allowed
        Returns: (allowed, remaining_requests)
        """
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > minute_ago
        ]
        
        current_count = len(self.requests[identifier])
        
        if current_count >= self.requests_per_minute:
            return False, 0
        
        self.requests[identifier].append(now)
        return True, self.requests_per_minute - current_count - 1
    
    async def __call__(self, request: Request):
        """Middleware to check rate limit"""
        # Use IP or user_id as identifier
        identifier = request.client.host if request.client else "unknown"
        
        allowed, remaining = self.check_rate_limit(identifier)
        
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Try again later."
            )
        
        request.state.rate_limit_remaining = remaining

rate_limiter = RateLimiter()
