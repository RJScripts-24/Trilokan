import json
import time
import os
from typing import Dict, Any

class ReviewQueue:
    def __init__(self, queue_dir: str = "temp_storage/review_queue"):
        """
        A local file-based queue for cases requiring human review.
        """
        self.queue_dir = queue_dir
        os.makedirs(queue_dir, exist_ok=True)

    def enqueue_for_review(self, audit_id: str, evidence_path: str, context: Dict[str, Any]):
        """
        Adds a case to the manual review workflow.
        """
        task = {
            "audit_id": audit_id,
            "status": "PENDING",
            "enqueued_at": time.time(),
            "evidence_path": evidence_path,
            "context": context
        }
        
        # Save as a JSON file in the queue folder
        filename = f"{int(time.time())}_{audit_id}.json"
        path = os.path.join(self.queue_dir, filename)
        
        with open(path, 'w') as f:
            json.dump(task, f, indent=4)
            
        print(f"[ReviewQueue] Case {audit_id} pushed to human review.")

    def fetch_pending(self):
        """
        Retrieves items waiting for review.
        """
        pending = []
        for f in os.listdir(self.queue_dir):
            if f.endswith(".json"):
                with open(os.path.join(self.queue_dir, f), 'r') as file:
                    pending.append(json.load(file))
        return pending

_review_q = None
def get_review_queue():
    global _review_q
    if _review_q is None:
        _review_q = ReviewQueue()
    return _review_q