"""
Retry node for LangGraph workflows.

Implements configurable retry logic with exponential backoff for resilient workflow execution.
"""

import time
from typing import TypedDict, Optional, Callable, Any, Literal
from datetime import datetime, timedelta


class RetryConfig(TypedDict, total=False):
    """Configuration for retry behavior."""
    max_attempts: int  # Maximum number of retry attempts (default: 3)
    initial_delay: float  # Initial delay in seconds (default: 1.0)
    max_delay: float  # Maximum delay in seconds (default: 60.0)
    backoff_factor: float  # Exponential backoff multiplier (default: 2.0)
    jitter: bool  # Add random jitter to delays (default: False)


class RetryState(TypedDict):
    """State tracking for retry attempts."""
    attempt: int  # Current attempt number (1-indexed)
    last_error: Optional[str]  # Last error message
    last_attempt_at: str  # ISO timestamp of last attempt
    next_retry_at: Optional[str]  # ISO timestamp of next retry (if applicable)
    total_delay: float  # Total time spent in delays (seconds)


class RetryResult(TypedDict):
    """Result from retry execution."""
    success: bool
    result: Any  # Result from successful execution
    error: Optional[str]  # Error message if all retries failed
    retry_state: RetryState


def with_retry(
    operation: Callable[[], Any],
    config: Optional[RetryConfig] = None,
    operation_name: str = "operation",
    should_retry: Optional[Callable[[Exception], bool]] = None
) -> RetryResult:
    """
    Execute an operation with exponential backoff retry logic.
    
    Args:
        operation: Callable to execute (should return result or raise exception)
        config: Optional retry configuration (uses defaults if not provided)
        operation_name: Name of operation for logging/debugging
        should_retry: Optional predicate to determine if exception should trigger retry
                     (default: retry all exceptions except KeyboardInterrupt)
    
    Returns:
        RetryResult with success status, result/error, and retry state
        
    Example:
        ```python
        from nodes.retry import with_retry, RetryConfig
        
        def create_document_node(state: WorkflowState) -> WorkflowState:
            def create_op():
                # Call Frappe API to create document
                response = frappe_api.create_doc("Sales Order", state["order_data"])
                return response
            
            result = with_retry(
                operation=create_op,
                config={"max_attempts": 5, "initial_delay": 2.0},
                operation_name="create_sales_order"
            )
            
            if not result["success"]:
                return {**state, "error": result["error"], "status": "failed"}
            
            return {**state, "sales_order_id": result["result"]["name"]}
        ```
    """
    # Default configuration
    cfg: RetryConfig = {
        "max_attempts": config.get("max_attempts", 3) if config else 3,
        "initial_delay": config.get("initial_delay", 1.0) if config else 1.0,
        "max_delay": config.get("max_delay", 60.0) if config else 60.0,
        "backoff_factor": config.get("backoff_factor", 2.0) if config else 2.0,
        "jitter": config.get("jitter", False) if config else False
    }
    
    # Default retry predicate: retry all except KeyboardInterrupt
    if should_retry is None:
        should_retry = lambda e: not isinstance(e, KeyboardInterrupt)
    
    # Initialize retry state
    retry_state = RetryState(
        attempt=0,
        last_error=None,
        last_attempt_at="",
        next_retry_at=None,
        total_delay=0.0
    )
    
    current_delay = cfg["initial_delay"]
    
    for attempt in range(1, cfg["max_attempts"] + 1):
        retry_state["attempt"] = attempt
        retry_state["last_attempt_at"] = datetime.utcnow().isoformat()
        
        try:
            # Execute operation
            result = operation()
            
            # Success!
            return RetryResult(
                success=True,
                result=result,
                error=None,
                retry_state=retry_state
            )
            
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            retry_state["last_error"] = error_msg
            
            # Check if we should retry this exception
            if not should_retry(e):
                return RetryResult(
                    success=False,
                    result=None,
                    error=f"Non-retryable error: {error_msg}",
                    retry_state=retry_state
                )
            
            # Check if we have more attempts
            if attempt >= cfg["max_attempts"]:
                return RetryResult(
                    success=False,
                    result=None,
                    error=f"Max retries ({cfg['max_attempts']}) exceeded. Last error: {error_msg}",
                    retry_state=retry_state
                )
            
            # Calculate delay with exponential backoff
            delay = min(current_delay, cfg["max_delay"])
            
            # Add jitter if configured (±25% randomness)
            if cfg["jitter"]:
                import random
                jitter_factor = 0.75 + (random.random() * 0.5)  # 0.75 to 1.25
                delay = delay * jitter_factor
            
            # Update retry state
            retry_state["total_delay"] += delay
            next_attempt_time = datetime.utcnow() + timedelta(seconds=delay)
            retry_state["next_retry_at"] = next_attempt_time.isoformat()
            
            # Wait before next attempt
            time.sleep(delay)
            
            # Increase delay for next iteration
            current_delay *= cfg["backoff_factor"]
    
    # Should not reach here, but return failure just in case
    return RetryResult(
        success=False,
        result=None,
        error="Retry loop completed without success or final failure",
        retry_state=retry_state
    )


def retry_on_network_error(
    operation: Callable[[], Any],
    max_attempts: int = 5,
    operation_name: str = "network_operation"
) -> RetryResult:
    """
    Convenience function for retrying network operations.
    
    Retries common network exceptions (ConnectionError, TimeoutError, etc.)
    with aggressive retry settings suitable for transient network issues.
    
    Args:
        operation: Network operation to execute
        max_attempts: Maximum retry attempts (default: 5)
        operation_name: Name for logging
    
    Returns:
        RetryResult from retry execution
        
    Example:
        ```python
        from nodes.retry import retry_on_network_error
        
        def fetch_data_node(state: WorkflowState) -> WorkflowState:
            def fetch():
                import requests
                response = requests.get(state["api_url"], timeout=10)
                response.raise_for_status()
                return response.json()
            
            result = retry_on_network_error(fetch, max_attempts=5)
            
            if not result["success"]:
                return {**state, "error": result["error"]}
            
            return {**state, "data": result["result"]}
        ```
    """
    network_exceptions = (
        ConnectionError,
        TimeoutError,
        # Add other network-related exceptions as needed
    )
    
    def is_network_error(e: Exception) -> bool:
        return isinstance(e, network_exceptions)
    
    return with_retry(
        operation=operation,
        config=RetryConfig(
            max_attempts=max_attempts,
            initial_delay=1.0,
            max_delay=30.0,
            backoff_factor=2.0,
            jitter=True
        ),
        operation_name=operation_name,
        should_retry=is_network_error
    )


def retry_frappe_api_call(
    operation: Callable[[], Any],
    max_attempts: int = 3,
    operation_name: str = "frappe_api_call"
) -> RetryResult:
    """
    Convenience function for retrying Frappe API calls.
    
    Retries on network errors and specific Frappe error codes (500, 502, 503, 504).
    Does not retry on 4xx client errors (except 429 rate limit).
    
    Args:
        operation: Frappe API call to execute
        max_attempts: Maximum retry attempts (default: 3)
        operation_name: Name for logging
    
    Returns:
        RetryResult from retry execution
        
    Example:
        ```python
        from nodes.retry import retry_frappe_api_call
        
        def update_document_node(state: WorkflowState) -> WorkflowState:
            def update():
                from api_client import frappe_client
                return frappe_client.update_doc(
                    "Sales Order",
                    state["order_id"],
                    {"status": "Completed"}
                )
            
            result = retry_frappe_api_call(update)
            
            if not result["success"]:
                return {**state, "error": result["error"]}
            
            return {**state, "update_completed": True}
        ```
    """
    def should_retry_frappe_error(e: Exception) -> bool:
        # Retry network errors
        if isinstance(e, (ConnectionError, TimeoutError)):
            return True
        
        # Check for HTTP status codes (if exception has status_code attribute)
        if hasattr(e, "status_code"):
            status = e.status_code
            # Retry server errors (500-504) and rate limit (429)
            if status in (429, 500, 502, 503, 504):
                return True
            # Don't retry client errors (4xx except 429)
            if 400 <= status < 500:
                return False
        
        # Retry unknown errors by default
        return True
    
    return with_retry(
        operation=operation,
        config=RetryConfig(
            max_attempts=max_attempts,
            initial_delay=2.0,
            max_delay=60.0,
            backoff_factor=2.0,
            jitter=False
        ),
        operation_name=operation_name,
        should_retry=should_retry_frappe_error
    )
