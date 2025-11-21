import logging
import random
import time
import requests
import config

logger = logging.getLogger("TrustGuard-Crawler")

class DomainScanner:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': random.choice(config.USER_AGENTS)})

    def _generate_typosquats(self, brand_name):
        """
        Generates potential phishing domain variations (Typosquatting).
        E.g., TrustGuard -> Trust-Guard-Login.com
        """
        suffixes = ["-login", "-secure", "-update", "-kyc", "-bank", "-support"]
        tlds = [".com", ".net", ".org", ".info", ".xyz"]
        
        variations = []
        clean_name = brand_name.replace(" ", "").lower()
        
        for suffix in suffixes:
            for tld in tlds:
                variations.append(f"{clean_name}{suffix}{tld}")
        
        return variations

    def _simulate_domain_monitoring(self, brand):
        """
        MOCK DATA GENERATOR:
        Simulates finding a suspicious domain in Certificate Transparency logs.
        """
        logger.debug(f"Scanning CT logs for brand: {brand}")
        
        detected_domains = []
        
        # 1. Generate a 'safe' domain (The real one)
        # We assume the real one is allowlisted or ignored elsewhere
        
        # 2. Generate a 'Phishing' domain
        # 40% chance to find a threat in this scan cycle
        if random.random() > 0.6:
            # Create a realistic phishing URL
            phishing_url = f"http://{brand.replace(' ', '-').lower()}-kyc-update.xyz"
            
            detected_domains.append({
                "domain": phishing_url,
                "registrar": "CheapDomains LLC",
                "created_date": "2023-10-25", # Recently created = High Risk
                "ssl_issuer": "Free SSL Let's Encrypt", # Common in phishing
                "ip_address": "192.168.X.X"
            })

        return detected_domains

    def _analyze_domain_content(self, url):
        """
        Fetches the domain content to see if it's cloning our login page.
        In the simulation, we just assign a high risk score based on the URL structure.
        """
        # Real logic would involve: 
        # response = requests.get(url)
        # if "Login" in response.text and "TrustGuard" in response.text: score = 100
        
        risk_score = 0
        
        # Check for phishing keywords in the URL itself
        for keyword in config.RISK_KEYWORDS:
            if keyword.replace(" ", "-") in url:
                risk_score += 40
                
        if ".xyz" in url or ".info" in url:
            risk_score += 20 # Suspicious TLDs

        return min(risk_score + 30, 100) # Base risk of 30 for just being a lookalike

    def scan_domains(self):
        """
        Main entry point called by main.py.
        """
        detected_threats = []

        for brand in config.TARGET_BRANDS:
            logger.info(f"Monitoring domains for brand: {brand}")
            
            # Get potential threats from our (simulated) CT Log monitor
            suspicious_domains = self._simulate_domain_monitoring(brand)

            for domain_data in suspicious_domains:
                url = domain_data['domain']
                
                # Analyze the threat
                risk_score = self._analyze_domain_content(url)
                
                if risk_score > 50:
                    logger.warning(f"PHISHING DOMAIN DETECTED: {url} (Risk: {risk_score})")
                    
                    threat_report = {
                        "source": "Certificate Transparency Log",
                        "name": f"Phishing Site: {url}",
                        "package": "N/A (Web Domain)",
                        "url": url,
                        "risk_score": "Critical" if risk_score > 80 else "High",
                        "details": f"Typosquatted domain registered via {domain_data['registrar']} mimicking {brand}."
                    }
                    detected_threats.append(threat_report)

        return detected_threats

# Expose a standalone function for main.py to call
scanner_instance = DomainScanner()
def scan_domains():
    return scanner_instance.scan_domains()