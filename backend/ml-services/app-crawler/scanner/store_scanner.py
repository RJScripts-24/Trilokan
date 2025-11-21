import logging
import random
import time
import requests
from bs4 import BeautifulSoup
import config

logger = logging.getLogger("TrustGuard-Crawler")

class StoreScanner:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': random.choice(config.USER_AGENTS)})

    def _calculate_risk_score(self, app_name, description=""):
        """
        Heuristic engine: Calculates a risk score (0-100) based on keywords.
        """
        score = 0
        name_lower = app_name.lower()
        desc_lower = description.lower()

        # 1. Check for High-Risk Keywords
        for keyword in config.RISK_KEYWORDS:
            if keyword in name_lower or keyword in desc_lower:
                score += 30

        # 2. Brand Imitation Check
        # If it uses the brand name but isn't official, that's critical.
        for brand in config.TARGET_BRANDS:
            if brand.lower() in name_lower:
                score += 50

        return min(score, 100)

    def _simulate_search_results(self, query):
        """
        MOCK DATA GENERATOR:
        Since real scraping of Google Play is often blocked by CAPTCHAs/IP bans,
        this function simulates what a scraper would find.
        It returns one 'Real' app and one 'Fake' app for demonstration.
        """
        logger.debug(f"Simulating store search for: {query}")
        
        results = []
        
        # 1. The Official App (Should be ignored by the detector)
        results.append({
            "name": "TrustGuard Bank Mobile",
            "package": "com.trustguard.bank.mobile", # Matches Allowlist
            "developer": "TrustGuard Official",
            "source": "Google Play (Simulated)",
            "url": "https://play.google.com/store/apps/details?id=com.trustguard.bank.mobile"
        })

        # 2. The Malicious Clone (Should be caught)
        # Only generate this for specific queries to simulate finding it occasionally
        if random.random() > 0.3: 
            results.append({
                "name": "TrustGuard Instant Loans - Fast Cash",
                "package": "com.fast.money.trustguard.clone", # NOT in Allowlist
                "developer": "Quick FinTech Pvt Ltd",
                "source": "APK Pure (Simulated)",
                "url": "https://apkpure.com/trustguard-loans/com.fast.money.trustguard.clone"
            })

        return results

    def _scrape_real_store(self, url, query):
        """
        Placeholder for ACTUAL scraping logic.
        In a production environment, this would parse HTML using BeautifulSoup.
        """
        # Example structure (commented out to prevent crashing on real sites):
        # response = self.session.get(url + query)
        # soup = BeautifulSoup(response.text, 'html.parser')
        # Parse specific div classes for Google Play/APKPure...
        return []

    def scan_stores(self):
        """
        Main entry point called by main.py.
        Iterates through target brands and scans configured stores.
        """
        detected_threats = []

        for brand in config.TARGET_BRANDS:
            logger.info(f"Searching stores for brand: {brand}")
            
            # In a real app, you would loop through config.STORE_URLS here.
            # For the prototype, we call the simulator.
            raw_apps = self._simulate_search_results(brand)

            for app in raw_apps:
                package_name = app.get('package')
                app_name = app.get('name')

                # --- CORE DETECTION LOGIC ---
                
                # 1. Allowlist Check: Is this an official app?
                if package_name in config.OFFICIAL_PACKAGES:
                    logger.debug(f"Skipping official app: {app_name}")
                    continue

                # 2. Risk Analysis: If it's not official, analyze it.
                risk_score = self._calculate_risk_score(app_name)
                
                # 3. Threshold Check
                if risk_score > 40:
                    logger.warning(f"THREAT DETECTED: {app_name} (Risk: {risk_score})")
                    threat_report = {
                        "source": app['source'],
                        "name": app_name,
                        "package": package_name,
                        "url": app['url'],
                        "risk_score": "Critical" if risk_score > 70 else "High",
                        "details": f"Unauthorized use of brand '{brand}' with risk keywords."
                    }
                    detected_threats.append(threat_report)

        return detected_threats

# Expose a standalone function for main.py to call
scanner_instance = StoreScanner()
def scan_stores():
    return scanner_instance.scan_stores()