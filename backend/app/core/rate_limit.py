"""Simple fixed-window rate limiter backed by Redis."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from app.core.redis_client import get_redis


async def _rate_limit_helper(request: Request, times: int, seconds: int, scope: str) -> None:
    """Internal helper to perform the rate limit check."""
    client_ip = request.client.host if request.client else "unknown"
    key = f"ratelimit:{scope}:{client_ip}"
    redis = get_redis()
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, seconds)
    if current > times:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again later.",
        )


def RateLimiter(*, times: int, seconds: int, scope: str = "global"):
    """Factory that creates a rate limit dependency."""
    
    async def limit_dep(request: Request) -> None:
        await _rate_limit_helper(request, times, seconds, scope)
        
    return limit_dep


login_rate_limiter = RateLimiter(times=10, seconds=60, scope="auth")