import numpy as np
from typing import Union, Tuple

def zscore(value: float, mean: float, std: float) -> float:
    """
    Computes the Z-score (standard score) of a value.
    Z = (X - μ) / σ
    
    Useful for determining how far a metric deviates from the 'normal' distribution
    observed in real faces (calibration stats).

    Args:
        value (float): The raw metric value.
        mean (float): The expected mean for a genuine sample.
        std (float): The expected standard deviation for a genuine sample.

    Returns:
        float: The z-score. Returns 0.0 if std is 0.
    """
    if std == 0:
        return 0.0
    
    return (value - mean) / std

def minmax(value: float, min_v: float, max_v: float, clip: bool = True) -> float:
    """
    Normalizes a value to the [0, 1] range based on known min/max bounds.
    
    Args:
        value (float): The raw value.
        min_v (float): The minimum bound.
        max_v (float): The maximum bound.
        clip (bool): If True, strictly clamps the result between 0 and 1.
                     If False, can return values outside [0, 1].

    Returns:
        float: Normalized value.
    """
    if max_v - min_v == 0:
        return 0.0
    
    norm = (value - min_v) / (max_v - min_v)
    
    if clip:
        return max(0.0, min(1.0, norm))
    return norm

def sigmoid(x: float, gain: float = 1.0, bias: float = 0.0) -> float:
    """
    Applies a sigmoid function to map an unbounded value to [0, 1].
    Useful for converting raw classifier margins/logits into probabilities.
    
    f(x) = 1 / (1 + exp(-gain * (x - bias)))

    Args:
        x (float): Input value.
        gain (float): Controls the steepness of the curve.
        bias (float): The x-value where the output is 0.5 (center).

    Returns:
        float: Value between 0 and 1.
    """
    # Clip exponent to avoid overflow
    exponent = -gain * (x - bias)
    exponent = max(-500, min(500, exponent))
    
    return 1.0 / (1.0 + np.exp(exponent))

def calibrate_score(
    raw_score: float, 
    threshold: float, 
    direction: str = 'higher_is_fake'
) -> float:
    """
    Converts a raw feature metric into a 'Probability of Fake' (0.0 to 1.0).
    
    Args:
        raw_score (float): The raw feature value (e.g., jitter variance).
        threshold (float): The value where the decision boundary sits (prob ~ 0.5).
        direction (str): 
            'higher_is_fake': Values > threshold indicate fake (e.g., Jitter).
            'lower_is_fake': Values < threshold indicate fake (e.g., Sharpness).

    Returns:
        float: Probability that the input is FAKE (0.0 to 1.0).
    """
    # We use a tuned sigmoid to map the threshold to 0.5
    # The gain determines how "hard" the threshold is.
    gain = 10.0  # Heuristic steepness
    
    if direction == 'higher_is_fake':
        # If score > threshold, prob -> 1.0
        # Bias = threshold
        # Input to sigmoid: (score - threshold)
        # If score = threshold, exp(0) = 1 -> 1/2 = 0.5
        val = (raw_score - threshold) / (threshold if threshold != 0 else 1.0)
        return sigmoid(val, gain=5.0, bias=0.0)
        
    elif direction == 'lower_is_fake':
        # If score < threshold, prob -> 1.0 (Fake)
        # If score > threshold, prob -> 0.0 (Real)
        # We invert the sign
        val = (threshold - raw_score) / (threshold if threshold != 0 else 1.0)
        return sigmoid(val, gain=5.0, bias=0.0)
    
    return 0.5