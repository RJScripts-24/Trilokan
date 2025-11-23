import time
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from typing import Callable, Any, Dict

# Configure Logger
logger = logging.getLogger("TrustGuardTimeouts")

class VerificationTimeout(Exception):
    """Custom exception raised when a verification stage exceeds its time budget."""
    pass

class TimeoutConfig:
    """
    Defines the strict SLAs (Service Level Agreements) for each stage.
    """
    # Stage 1 (Fast Checks) should be near-instant.
    # If it takes > 500ms, something is wrong (e.g., DB hang).
    STAGE_1_LIMIT_SEC = 0.5 
    
    # Stage 2 (Heavy AI) involves neural nets. 
    # We allow more time, but cap it to prevent UX frustration.
    STAGE_2_LIMIT_SEC = 4.0 
    
    # Total end-to-end budget before the UI should show "Try Again"
    TOTAL_REQUEST_LIMIT_SEC = 5.0

def run_with_timeout(
    func: Callable, 
    args: tuple = (), 
    kwargs: dict = None, 
    timeout_sec: float = 1.0,
    stage_name: str = "Unknown Stage"
) -> Any:
    """
    Executes a function in a separate thread and enforces a strict timeout.
    
    If the function takes longer than `timeout_sec`, it raises VerificationTimeout
    and returns control to the main orchestrator (though the thread may continue 
    in the background until finished).

    Args:
        func (Callable): The function to run (e.g., stage2.run_stage2).
        args (tuple): Positional arguments for the function.
        kwargs (dict): Keyword arguments.
        timeout_sec (float): Max allowed time in seconds.
        stage_name (str): Label for logging.

    Returns:
        The result of func(*args, **kwargs).

    Raises:
        VerificationTimeout: If time limit is exceeded.
        Exception: Any error raised inside the function.
    """
    if kwargs is None:
        kwargs = {}

    start_t = time.time()
    
    # We use a ThreadPoolExecutor to run the task asynchronously
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(func, *args, **kwargs)
        
        try:
            # wait for result with a timeout
            result = future.result(timeout=timeout_sec)
            elapsed = time.time() - start_t
            
            # Warn if we are getting close to the limit (within 80%)
            if elapsed > (timeout_sec * 0.8):
                logger.warning(f"Performance Warning: {stage_name} took {elapsed:.2f}s (Limit: {timeout_sec}s)")
            
            return result

        except FutureTimeoutError:
            elapsed = time.time() - start_t
            msg = f"{stage_name} timed out after {elapsed:.2f}s (Limit: {timeout_sec}s)"
            logger.error(msg)
            # We raise our custom exception to be caught by the Orchestrator
            raise VerificationTimeout(msg)
        
        except Exception as e:
            # Re-raise any other exception that happened inside the stage
            logger.error(f"{stage_name} crashed: {e}")
            raise e

def check_time_budget(start_time: float, max_duration: float) -> float:
    """
    Helper to check remaining time in a budget.
    
    Returns:
        float: Remaining seconds.
    
    Raises:
        VerificationTimeout: If budget is already exhausted.
    """
    elapsed = time.time() - start_time
    remaining = max_duration - elapsed
    
    if remaining <= 0:
        raise VerificationTimeout(f"Global time budget exhausted (Elapsed: {elapsed:.2f}s)")
        
    return remaining