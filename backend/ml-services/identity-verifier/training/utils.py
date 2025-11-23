import logging
import os
import json
import pickle
import time

def setup_logger(name: str, log_dir: str = "logs"):
    os.makedirs(log_dir, exist_ok=True)
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    
    # File Handler
    fh = logging.FileHandler(os.path.join(log_dir, f"{name}_{int(time.time())}.log"))
    fh.setFormatter(formatter)
    logger.addHandler(fh)
    
    # Console Handler
    ch = logging.StreamHandler()
    ch.setFormatter(formatter)
    logger.addHandler(ch)
    
    return logger

def save_json(data: dict, path: str):
    with open(path, 'w') as f:
        json.dump(data, f, indent=4)

def save_pickle(obj, path: str):
    with open(path, 'wb') as f:
        pickle.dump(obj, f)

def load_pickle(path: str):
    with open(path, 'rb') as f:
        return pickle.load(f)