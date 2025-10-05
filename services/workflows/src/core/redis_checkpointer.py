"""
Redis-based workflow state persistence for LangGraph.

Implements RedisSaver with 24-hour TTL and activity-based extension.
Compatible with LangGraph's BaseCheckpointSaver interface.
"""

import json
import pickle
from typing import Any, AsyncIterator, Iterator, Optional
from datetime import datetime, timedelta

try:
    import redis.asyncio as aioredis
    from redis.asyncio import Redis
except ImportError:
    # Fallback for older redis-py versions
    import redis
    Redis = redis.Redis
    aioredis = None

from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple


class RedisSaver(BaseCheckpointSaver):
    """
    Redis-based checkpoint saver for LangGraph workflows.
    
    Features:
    - 24-hour default TTL for workflow states
    - Activity-based TTL extension (resets on each update)
    - Namespace isolation for multi-tenancy
    - Automatic state cleanup
    - Thread-based state organization
    
    Example:
        ```python
        from core.redis_checkpointer import RedisSaver
        from langgraph.graph import StateGraph
        
        # Create Redis checkpointer
        checkpointer = RedisSaver(
            redis_url="redis://localhost:6379/0",
            ttl_hours=24,
            namespace="workflows"
        )
        
        # Use with LangGraph
        graph = StateGraph(MyState)
        # ... add nodes and edges ...
        compiled = graph.compile(checkpointer=checkpointer)
        ```
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379/0",
        ttl_hours: int = 24,
        namespace: str = "langgraph",
        extend_on_access: bool = True,
        **redis_kwargs
    ):
        """
        Initialize Redis checkpointer.
        
        Args:
            redis_url: Redis connection URL
            ttl_hours: Time-to-live in hours (default: 24)
            namespace: Key namespace for isolation (default: "langgraph")
            extend_on_access: Whether to extend TTL on state access (default: True)
            **redis_kwargs: Additional arguments for Redis client
        """
        super().__init__()
        
        self.redis_url = redis_url
        self.ttl_seconds = ttl_hours * 3600
        self.namespace = namespace
        self.extend_on_access = extend_on_access
        self.redis_kwargs = redis_kwargs
        
        # Initialize sync Redis client
        self._redis: Optional[Redis] = None
        self._async_redis: Optional[Any] = None
    
    def _get_redis(self) -> Redis:
        """Get or create synchronous Redis connection."""
        if self._redis is None:
            self._redis = redis.Redis.from_url(
                self.redis_url,
                decode_responses=False,  # We'll handle encoding ourselves
                **self.redis_kwargs
            )
        return self._redis
    
    async def _get_async_redis(self) -> Any:
        """Get or create asynchronous Redis connection."""
        if self._async_redis is None:
            if aioredis is None:
                raise RuntimeError(
                    "Async Redis not available. Install redis[asyncio] for async support."
                )
            self._async_redis = await aioredis.from_url(
                self.redis_url,
                decode_responses=False,
                **self.redis_kwargs
            )
        return self._async_redis
    
    def _make_key(self, thread_id: str, checkpoint_id: Optional[str] = None) -> str:
        """
        Generate Redis key for checkpoint.
        
        Format: {namespace}:checkpoint:{thread_id}:{checkpoint_id}
        If checkpoint_id is None, returns pattern for listing: {namespace}:checkpoint:{thread_id}:*
        """
        if checkpoint_id is None:
            return f"{self.namespace}:checkpoint:{thread_id}:*"
        return f"{self.namespace}:checkpoint:{thread_id}:{checkpoint_id}"
    
    def _make_metadata_key(self, thread_id: str) -> str:
        """Generate Redis key for thread metadata."""
        return f"{self.namespace}:metadata:{thread_id}"
    
    def _serialize_checkpoint(self, checkpoint: Checkpoint) -> bytes:
        """Serialize checkpoint to bytes using pickle."""
        return pickle.dumps(checkpoint)
    
    def _deserialize_checkpoint(self, data: bytes) -> Checkpoint:
        """Deserialize checkpoint from bytes."""
        return pickle.loads(data)
    
    def _serialize_metadata(self, metadata: CheckpointMetadata) -> str:
        """Serialize metadata to JSON string."""
        return json.dumps(metadata)
    
    def _deserialize_metadata(self, data: str) -> CheckpointMetadata:
        """Deserialize metadata from JSON string."""
        return json.loads(data)
    
    def put(
        self,
        config: dict[str, Any],
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata
    ) -> dict[str, Any]:
        """
        Save checkpoint to Redis with TTL.
        
        Args:
            config: LangGraph config containing thread_id
            checkpoint: Checkpoint data to save
            metadata: Checkpoint metadata
        
        Returns:
            Updated config with checkpoint_id
        """
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = checkpoint["id"]
        
        # Serialize checkpoint and metadata
        checkpoint_data = self._serialize_checkpoint(checkpoint)
        metadata_data = self._serialize_metadata(metadata)
        
        # Get Redis connection
        redis = self._get_redis()
        
        # Save checkpoint with TTL
        checkpoint_key = self._make_key(thread_id, checkpoint_id)
        redis.set(checkpoint_key, checkpoint_data, ex=self.ttl_seconds)
        
        # Save metadata with TTL
        metadata_key = self._make_metadata_key(thread_id)
        redis.set(metadata_key, metadata_data, ex=self.ttl_seconds)
        
        # Update config with checkpoint_id
        return {
            **config,
            "configurable": {
                **config["configurable"],
                "checkpoint_id": checkpoint_id
            }
        }
    
    async def aput(
        self,
        config: dict[str, Any],
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata
    ) -> dict[str, Any]:
        """Async version of put."""
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = checkpoint["id"]
        
        # Serialize checkpoint and metadata
        checkpoint_data = self._serialize_checkpoint(checkpoint)
        metadata_data = self._serialize_metadata(metadata)
        
        # Get async Redis connection
        redis = await self._get_async_redis()
        
        # Save checkpoint with TTL
        checkpoint_key = self._make_key(thread_id, checkpoint_id)
        await redis.set(checkpoint_key, checkpoint_data, ex=self.ttl_seconds)
        
        # Save metadata with TTL
        metadata_key = self._make_metadata_key(thread_id)
        await redis.set(metadata_key, metadata_data, ex=self.ttl_seconds)
        
        return {
            **config,
            "configurable": {
                **config["configurable"],
                "checkpoint_id": checkpoint_id
            }
        }
    
    def get(self, config: dict[str, Any]) -> Optional[Checkpoint]:
        """
        Retrieve checkpoint from Redis.
        
        Args:
            config: LangGraph config containing thread_id and optional checkpoint_id
        
        Returns:
            Checkpoint if found, None otherwise
        """
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = config["configurable"].get("checkpoint_id")
        
        if checkpoint_id is None:
            # Get latest checkpoint for thread
            return self._get_latest(thread_id)
        
        # Get specific checkpoint
        redis = self._get_redis()
        checkpoint_key = self._make_key(thread_id, checkpoint_id)
        
        data = redis.get(checkpoint_key)
        if data is None:
            return None
        
        # Extend TTL if configured
        if self.extend_on_access:
            redis.expire(checkpoint_key, self.ttl_seconds)
            metadata_key = self._make_metadata_key(thread_id)
            redis.expire(metadata_key, self.ttl_seconds)
        
        return self._deserialize_checkpoint(data)
    
    async def aget(self, config: dict[str, Any]) -> Optional[Checkpoint]:
        """Async version of get."""
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = config["configurable"].get("checkpoint_id")
        
        if checkpoint_id is None:
            return await self._aget_latest(thread_id)
        
        redis = await self._get_async_redis()
        checkpoint_key = self._make_key(thread_id, checkpoint_id)
        
        data = await redis.get(checkpoint_key)
        if data is None:
            return None
        
        # Extend TTL if configured
        if self.extend_on_access:
            await redis.expire(checkpoint_key, self.ttl_seconds)
            metadata_key = self._make_metadata_key(thread_id)
            await redis.expire(metadata_key, self.ttl_seconds)
        
        return self._deserialize_checkpoint(data)
    
    def _get_latest(self, thread_id: str) -> Optional[Checkpoint]:
        """Get the latest checkpoint for a thread."""
        redis = self._get_redis()
        pattern = self._make_key(thread_id)
        
        # Find all checkpoints for thread
        keys = list(redis.scan_iter(match=pattern))
        if not keys:
            return None
        
        # Get all checkpoints and find latest by timestamp
        checkpoints = []
        for key in keys:
            data = redis.get(key)
            if data:
                checkpoint = self._deserialize_checkpoint(data)
                checkpoints.append(checkpoint)
        
        if not checkpoints:
            return None
        
        # Return checkpoint with latest timestamp
        latest = max(checkpoints, key=lambda c: c.get("ts", 0))
        
        # Extend TTL on access
        if self.extend_on_access:
            checkpoint_key = self._make_key(thread_id, latest["id"])
            redis.expire(checkpoint_key, self.ttl_seconds)
            metadata_key = self._make_metadata_key(thread_id)
            redis.expire(metadata_key, self.ttl_seconds)
        
        return latest
    
    async def _aget_latest(self, thread_id: str) -> Optional[Checkpoint]:
        """Async version of _get_latest."""
        redis = await self._get_async_redis()
        pattern = self._make_key(thread_id)
        
        # Find all checkpoints for thread
        keys = []
        async for key in redis.scan_iter(match=pattern):
            keys.append(key)
        
        if not keys:
            return None
        
        # Get all checkpoints and find latest
        checkpoints = []
        for key in keys:
            data = await redis.get(key)
            if data:
                checkpoint = self._deserialize_checkpoint(data)
                checkpoints.append(checkpoint)
        
        if not checkpoints:
            return None
        
        latest = max(checkpoints, key=lambda c: c.get("ts", 0))
        
        # Extend TTL on access
        if self.extend_on_access:
            checkpoint_key = self._make_key(thread_id, latest["id"])
            await redis.expire(checkpoint_key, self.ttl_seconds)
            metadata_key = self._make_metadata_key(thread_id)
            await redis.expire(metadata_key, self.ttl_seconds)
        
        return latest
    
    def list(self, config: dict[str, Any]) -> Iterator[CheckpointTuple]:
        """
        List all checkpoints for a thread.
        
        Args:
            config: LangGraph config containing thread_id
        
        Yields:
            CheckpointTuple for each checkpoint
        """
        thread_id = config["configurable"]["thread_id"]
        redis = self._get_redis()
        pattern = self._make_key(thread_id)
        
        # Find all checkpoints for thread
        for key in redis.scan_iter(match=pattern):
            data = redis.get(key)
            if data:
                checkpoint = self._deserialize_checkpoint(data)
                
                # Get metadata
                metadata_key = self._make_metadata_key(thread_id)
                metadata_data = redis.get(metadata_key)
                metadata = (
                    self._deserialize_metadata(metadata_data)
                    if metadata_data
                    else {}
                )
                
                yield CheckpointTuple(
                    config={
                        **config,
                        "configurable": {
                            **config["configurable"],
                            "checkpoint_id": checkpoint["id"]
                        }
                    },
                    checkpoint=checkpoint,
                    metadata=metadata
                )
    
    async def alist(self, config: dict[str, Any]) -> AsyncIterator[CheckpointTuple]:
        """Async version of list."""
        thread_id = config["configurable"]["thread_id"]
        redis = await self._get_async_redis()
        pattern = self._make_key(thread_id)
        
        async for key in redis.scan_iter(match=pattern):
            data = await redis.get(key)
            if data:
                checkpoint = self._deserialize_checkpoint(data)
                
                metadata_key = self._make_metadata_key(thread_id)
                metadata_data = await redis.get(metadata_key)
                metadata = (
                    self._deserialize_metadata(metadata_data)
                    if metadata_data
                    else {}
                )
                
                yield CheckpointTuple(
                    config={
                        **config,
                        "configurable": {
                            **config["configurable"],
                            "checkpoint_id": checkpoint["id"]
                        }
                    },
                    checkpoint=checkpoint,
                    metadata=metadata
                )
    
    def close(self):
        """Close Redis connections."""
        if self._redis:
            self._redis.close()
            self._redis = None
    
    async def aclose(self):
        """Close async Redis connections."""
        if self._async_redis:
            await self._async_redis.close()
            self._async_redis = None
    
    def __del__(self):
        """Cleanup on deletion."""
        try:
            self.close()
        except:
            pass


# Convenience function for creating Redis checkpointer
def create_redis_checkpointer(
    redis_url: Optional[str] = None,
    ttl_hours: int = 24,
    namespace: str = "langgraph",
    **redis_kwargs
) -> RedisSaver:
    """
    Create a Redis checkpointer with sensible defaults.
    
    Args:
        redis_url: Redis connection URL (default: from env REDIS_URL or "redis://localhost:6379/0")
        ttl_hours: State TTL in hours (default: 24)
        namespace: Key namespace (default: "langgraph")
        **redis_kwargs: Additional Redis client arguments
    
    Returns:
        Configured RedisSaver instance
        
    Example:
        ```python
        from core.redis_checkpointer import create_redis_checkpointer
        
        checkpointer = create_redis_checkpointer(
            redis_url="redis://localhost:6379/0",
            ttl_hours=24
        )
        
        graph = StateGraph(MyState)
        # ... configure graph ...
        compiled = graph.compile(checkpointer=checkpointer)
        ```
    """
    import os
    
    if redis_url is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    return RedisSaver(
        redis_url=redis_url,
        ttl_hours=ttl_hours,
        namespace=namespace,
        **redis_kwargs
    )


__all__ = ["RedisSaver", "create_redis_checkpointer"]
