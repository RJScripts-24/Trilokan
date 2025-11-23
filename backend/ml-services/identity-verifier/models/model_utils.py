import time
import numpy as np
import os
import json
from typing import Callable, Tuple, Any, List

def warmup_model(
    inference_func: Callable[[np.ndarray], Any], 
    input_shape: Tuple[int, ...], 
    n_iters: int = 3,
    dtype: type = np.float32
):
    """
    Runs dummy inference passes to initialize model buffers and caches.
    Essential for reducing latency on the very first user request.

    Args:
        inference_func (Callable): The function to call (e.g., model.predict).
        input_shape (tuple): Shape of the dummy input (e.g., (224, 224, 3)).
        n_iters (int): Number of warmup passes.
        dtype (type): Data type of input (default np.float32 or np.uint8).
    """
    print(f"Warming up model with shape {input_shape}...")
    
    # Generate random noise or zeros
    if dtype == np.uint8:
        dummy_input = np.random.randint(0, 255, input_shape, dtype=np.uint8)
    else:
        dummy_input = np.random.rand(*input_shape).astype(dtype)

    try:
        start_t = time.time()
        for _ in range(n_iters):
            _ = inference_func(dummy_input)
        end_t = time.time()
        
        avg_time = (end_t - start_t) / n_iters
        print(f"Warmup complete. Avg latency: {avg_time*1000:.2f}ms")
        
    except Exception as e:
        print(f"Warmup failed: {e}")

def measure_latency(
    inference_func: Callable, 
    sample_input: Any, 
    n_runs: int = 10
) -> float:
    """
    Benchmarks the average inference time of a model function.
    
    Returns:
        float: Average milliseconds per call.
    """
    timings = []
    
    # Burn-in
    try:
        _ = inference_func(sample_input)
    except:
        pass

    for _ in range(n_runs):
        t0 = time.time()
        _ = inference_func(sample_input)
        t1 = time.time()
        timings.append(t1 - t0)

    avg_ms = (sum(timings) / len(timings)) * 1000
    return avg_ms

def softmax(x: np.ndarray) -> np.ndarray:
    """
    Computes softmax values for each set of scores in x.
    Stable version to avoid overflow.
    """
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum(axis=0)

def quantize_weights_mock(model_path: str, output_path: str):
    """
    Placeholder for model quantization (Float32 -> Int8).
    
    In a real PyTorch/TF workflow, this would load the model graph 
    and apply dynamic quantization to reduce size by ~4x.
    """
    print(f"Quantizing model at {model_path}...")
    
    if not os.path.exists(model_path):
        print("Error: Source model not found.")
        return

    # In a real scenario:
    # model = torch.load(model_path)
    # quantized_model = torch.quantization.quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)
    # torch.save(quantized_model, output_path)
    
    print(f"Simulated quantization complete. Saved to {output_path}")

def convert_to_onnx_mock(model, dummy_input, output_path: str):
    """
    Helper to export a PyTorch/Keras model to ONNX format 
    for cross-platform compatibility.
    """
    try:
        import torch
        print(f"Exporting model to ONNX: {output_path}")
        torch.onnx.export(
            model, 
            dummy_input, 
            output_path,
            opset_version=11,
            input_names=['input'],
            output_names=['output']
        )
    except ImportError:
        print("Torch not installed, skipping ONNX export.")
    except Exception as e:
        print(f"ONNX Export failed: {e}")

def load_json_config(path: str) -> dict:
    """
    Safely loads a JSON configuration file.
    """
    if not os.path.exists(path):
        return {}
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading config {path}: {e}")
        return {}