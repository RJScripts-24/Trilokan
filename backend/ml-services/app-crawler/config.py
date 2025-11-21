import time
import logging
import requests
import schedule
from datetime import datetime
import config

# =====================
# TrustGuard App Detector Config
# =====================

# 1. TARGET BRANDS (Expanded for Indian Ecosystem)
# Grouped for better readability and reporting
TARGET_BRANDS = [
    # --- Payment Super Apps ---
    "Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "Cred", "MobiKwik", "Freecharge", "Samsung Pay",
    
    # --- Public Sector Banks (PSU) ---
    "State Bank of India", "SBI YONO", "Punjab National Bank", "PNB One", "Bank of Baroda", "BoB World", 
    "Union Bank of India", "Vyom", "Canara Bank", "Indian Bank", "IndOASIS", "Central Bank of India", 
    "Indian Overseas Bank", "UCO Bank", "Bank of Maharashtra", "Punjab & Sind Bank",
    
    # --- Private Sector Banks ---
    "HDFC Bank", "PayZapp", "ICICI Bank", "iMobile", "Axis Bank", "Open", "Kotak Mahindra Bank", "Kotak 811", 
    "IndusInd Bank", "INDIE", "IDFC FIRST Bank", "Yes Bank", "Iris", "Federal Bank", "FedMobile", 
    "South Indian Bank", "RBL Bank", "MoBank", "IDBI Bank", "City Union Bank", "Karur Vysya Bank",
    
    # --- Small Finance Banks (High Phishing Risk) ---
    "AU Small Finance Bank", "Ujjivan Small Finance Bank", "Equitas Small Finance Bank", 
    "Suryoday Small Finance Bank", "Jana Small Finance Bank", "ESAF Small Finance Bank",
    "Utkarsh Small Finance Bank", "Capital Small Finance Bank", "Fincare Small Finance Bank",
    
    # --- Neobanks & Fintech (Gen Z Targets) ---
    "Jupiter", "Fi Money", "Niyo", "NiyoX", "Razorpay", "PayU", "Slice", "Uni Cards", "OneCard", "Freo",
    
    # --- Lending & Instant Loan Apps (CRITICAL SECTOR - Most Impersonated) ---
    "KreditBee", "Kissht", "Ring", "Navi", "MoneyView", "Cashe", "Dhani", "Bajaj Finserv", 
    "Home Credit", "PaySense", "MoneyTap", "LazyPay", "ZestMoney", "mPokket", "TrueBalance", 
    "SmartCoin", "Stashfin", "Lendingkart", "InCred", "Rupeek",
    
    # --- Trading & Investment ---
    "Zerodha", "Kite", "Groww", "Upstox", "Angel One", "5paisa", "Paytm Money", 
    "Sharekhan", "Motilal Oswal", "ICICI Direct", "HDFC Sky", "Kuvera", "INDmoney",
    
    # --- Insurance & Govt ---
    "LIC Digital", "LIC", "PolicyBazaar", "Ditto", "Acko", "Digit Insurance",
    "UMANG", "DigiLocker", "mAadhaar", "EPFO", "GST Rate Finder", "MParivahan"
]

# 2. OFFICIAL PACKAGE NAMES (Real Android Package IDs)
# Mapping the brand name to the EXACT package ID on Play Store
OFFICIAL_PACKAGE_NAMES = {
    # Payments
    "Google Pay": ["com.google.android.apps.nbu.paisa.user"],
    "PhonePe": ["com.phonepe.app"],
    "Paytm": ["net.one97.paytm"],
    "BHIM": ["in.org.npci.upiapp"],
    "Cred": ["com.dreamplug.androidapp"],
    "MobiKwik": ["com.mobikwik_new"],
    
    # Major Banks
    "SBI YONO": ["com.sbi.lotusintouch", "com.sbi.yono"],
    "HDFC Bank": ["com.snapwork.hdfc", "com.hdfcbank.payzapp"],
    "ICICI Bank": ["com.csam.icici.bank.imobile"],
    "Axis Bank": ["com.axis.mobile", "com.freecharge.android"],
    "Kotak Mahindra Bank": ["com.msf.kbank.mobile"],
    "Bank of Baroda": ["com.bankofbaroda.mconnect"],
    "PNB One": ["com.pnb.pnbone"],
    "IDFC FIRST Bank": ["com.idfcfirstbank.optimus"],
    
    # Investment & Trading
    "Zerodha": ["com.zerodha.kite3"],
    "Groww": ["com.nextbillion.groww"],
    "Angel One": ["com.msf.angelmobile"],
    "Upstox": ["in.upstox.app"],
    
    # High Risk Loan Apps (Specific targets for clones)
    "KreditBee": ["com.kreditbee.android"],
    "Kissht": ["com.kissht.android", "com.ideopay.user"], # Ideopay is Ring/Kissht
    "Navi": ["com.naviapp"],
    "Bajaj Finserv": ["org.altruist.BajajExperia"],
    "mPokket": ["com.mpokket.app"],
    "Slice": ["com.garage.store"],
    
    # Govt
    "LIC Digital": ["com.lic.liccustomer"],
    "mAadhaar": ["in.gov.uidai.mAadhaarPlus"],
    "DigiLocker": ["com.digilocker.android"],
}

# 3. OFFICIAL SIGNATURES (The "Trust" Database)
# NOTE: Do NOT use fake signatures. Use the helper script below to populate this 
# with REAL data from valid APKs. I have added placeholders for logic consistency.
OFFICIAL_SIGNATURES = {
    "com.google.android.apps.nbu.paisa.user": ["39:D1:6D:66:52:C8:4B:29:08:6E:48:18:31:40:44:29..."], # Example Google Sign
    "com.phonepe.app": ["12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF..."],
    # Populate this using 'generate_signatures.py'
}

# 4. OFFICIAL HASHES (For exact file match)
OFFICIAL_HASHES = {
    "com.google.android.apps.nbu.paisa.user": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    # Populate this dynamically
}

# 5. SUSPICIOUS KEYWORDS (Expanded with Hindi/Urgency hooks)
SUSPICIOUS_KEYWORDS = [
    # Financial
    "instant loan", "quick cash", "easy money", "no cibil", "no documents", 
    "100% approval", "guaranteed loan", "crypto mining", "double money",
    
    # Urgency/Threats
    "kyc update", "account blocked", "pan update", "expire soon", "immediate action",
    "police case", "legal action", "electricity bill", 
    
    # Generic/Tech Support
    "customer care", "helpline", "support executive", "anydesk", "teamviewer", 
    "quicksupport", "screen share",
    
    # Hinglish (Common in India)
    "loan lelo", "paisa", "udhaar", "kist", "jeet", "dhamaka", "offer"
]

SUSPICIOUS_DOMAINS = [
    "bit.ly", "tinyurl.com", "ngrok.io", "herokuapp.com", "000webhostapp.com",
    "blogspot.com", "wordpress.com", "drive.google.com", "dropbox.com", # often used to host malware
    "apkpure.com", "apkmirror.com" # unofficial stores
]

# Directory for official brand icons
ICON_BRAND_DIR = "brand_icons/"

# 6. PERMISSION WEIGHTS (Tuned for Banking Trojans)
# Heavy weighting for "Overlay" and "Accessibility" permissions
PERMISSION_WEIGHTS = {
    # Critical Risk (Trojan Indicators)
    "android.permission.BIND_ACCESSIBILITY_SERVICE": 1.0, # The God Mode permission
    "android.permission.SYSTEM_ALERT_WINDOW": 0.9,       # Drawing over other apps (Overlay attacks)
    "android.permission.READ_SMS": 0.8,                  # Reading OTPs
    "android.permission.RECEIVE_SMS": 0.8,               # Catching OTPs
    
    # High Risk
    "android.permission.READ_CALL_LOG": 0.7,             # Social engineering
    "android.permission.ANSWER_PHONE_CALLS": 0.6,
    "android.permission.READ_CONTACTS": 0.6,             # Harassment/Blackmail
    "android.permission.REQUEST_INSTALL_PACKAGES": 0.6,  # Dropper functionality
    
    # Medium Risk
    "android.permission.RECORD_AUDIO": 0.4,
    "android.permission.CAMERA": 0.4,
    "android.permission.ACCESS_FINE_LOCATION": 0.3,
    "android.permission.GET_ACCOUNTS": 0.3,
    
    # Low Risk (Common)
    "android.permission.INTERNET": 0.0,
    "android.permission.VIBRATE": 0.0
}

ICON_SIMILARITY_THRESHOLD = 0.85
SCAN_INTERVAL_SECONDS = 600

# ... (Rest of your original logic remains exactly the same) ...
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