import time
import logging
import requests
import schedule
from datetime import datetime
import config

# Import scanner modules
# We wrap these in try-except blocks so the script doesn't crash
# if you run it before creating the scanner files.
try:
    from scanners import store_scanner
    from scanners import domain_scanner
except ImportError:
    print("Warning: Scanner modules not found. Please ensure scanners/store_scanner.py exists.")
    # Mocking for initial run/testing
    class MockScanner:
        def scan(self): return []
    store_scanner = MockScanner()
    domain_scanner = MockScanner()

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("crawler.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("TrustGuard-Crawler")

def report_threats(threats):
    """
    sends detected threats to the central Grievance/Fraud API.
    """
    if not threats:
        logger.info("No threats to report.")
        return

    logger.info(f"Reporting {len(threats)} detected threats to backend...")
    
    headers = {'Content-Type': 'application/json'}
    
    for threat in threats:
        try:
            # In a real production app, you might batch these
            payload = {
                "source": threat.get('source'),
                "app_name": threat.get('name'),
                "package_name": threat.get('package'),
                "url": threat.get('url'),
                "risk_score": threat.get('risk_score', "High"),
                "detected_at": datetime.now().isoformat()
            }
            
            # Send to the main API (defined in config.py)
            # We use a timeout to prevent hanging if the API is down
            response = requests.post(
                config.REPORTING_API_URL, 
                json=payload, 
                timeout=config.TIMEOUT
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully reported: {threat.get('name')}")
            else:
                logger.error(f"Failed to report {threat.get('name')}: Status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error reporting threat: {e}")

def run_scan_cycle():
    """
    Executes one full scan cycle across all channels.
    """
    logger.info("Starting new scan cycle...")
    start_time = time.time()
    all_threats = []

    # 1. Scan App Stores (APK Pure, etc.)
    logger.info("Phase 1: Scanning App Stores...")
    try:
        store_threats = store_scanner.scan_stores()
        logger.info(f"Store Scan finished. Found {len(store_threats)} potential threats.")
        all_threats.extend(store_threats)
    except Exception as e:
        logger.error(f"Error during Store Scan: {e}")

    # 2. Scan Suspicious Domains
    logger.info("Phase 2: Scanning Domains...")
    try:
        domain_threats = domain_scanner.scan_domains()
        logger.info(f"Domain Scan finished. Found {len(domain_threats)} potential threats.")
        all_threats.extend(domain_threats)
    except Exception as e:
        logger.error(f"Error during Domain Scan: {e}")

    # 3. Report Findings
    if all_threats:
        report_threats(all_threats)
    else:
        logger.info("Clean scan. No threats detected.")

    duration = time.time() - start_time
    logger.info(f"Scan cycle completed in {duration:.2f} seconds.")

def start_scheduler():
    """
    Initializes the schedule based on config.
    """
    logger.info(f"Initializing Scheduler. Interval: {config.SCAN_INTERVAL_SECONDS} seconds.")
    
    # Run once immediately on startup
    run_scan_cycle()
    
    # Schedule future runs
    schedule.every(config.SCAN_INTERVAL_SECONDS).seconds.do(run_scan_cycle)
    
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    print(f"--- TrustGuard Crawler Service v1.0 ---")
    print(f"Targeting Brands: {config.TARGET_BRANDS}")
    start_scheduler()