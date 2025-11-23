# Security Posture & Authentication Architecture

**Document Version:** 1.0.0  
**Last Updated:** November 23, 2025  
**Status:** Current Implementation Review & Future Recommendations

---

## Executive Summary

This document evaluates the current authentication and authorization mechanisms in the Trilokan platform and provides recommendations for enhanced security measures.

### Current Security Level: **MODERATE**
- ✅ JWT-based authentication implemented
- ✅ API key authentication for ML services
- ✅ Role-based access control (RBAC)
- ⚠️ Limited OAuth/OIDC support
- ⚠️ No mutual TLS (mTLS) implementation
- ⚠️ No advanced threat protection

---

## 1. Current Authentication Mechanisms

### 1.1 API Gateway Authentication

#### JWT (JSON Web Tokens)
**Status:** ✅ **IMPLEMENTED**

**How it works:**
```
User Login → JWT Access Token (30 min) + Refresh Token (30 days)
Subsequent requests → Bearer token in Authorization header
Token refresh → New access token using refresh token
```

**Implementation Details:**
- **Location:** `api-gateway/src/config/passport.js`
- **Strategy:** Passport JWT Strategy
- **Token Storage:** Database (tokens table)
- **Algorithm:** HS256 (HMAC SHA256)
- **Secret:** Environment variable `JWT_SECRET`

**Strengths:**
- ✅ Stateless authentication
- ✅ Short-lived access tokens reduce exposure window
- ✅ Refresh token rotation supported
- ✅ Token blacklist mechanism for logout

**Weaknesses:**
- ⚠️ HS256 (symmetric) vs RS256 (asymmetric) - consider upgrading for microservices
- ⚠️ No token rotation on refresh (could be enhanced)
- ⚠️ No device fingerprinting or binding

**Current Code Reference:**
```javascript
// api-gateway/src/middleware/auth.middleware.js
const auth = (...requiredRoles) => async (req, res, next) => {
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, 
      verifyCallback(req, resolve, reject, requiredRoles)
    )(req, res, next);
  })
  .then(() => next())
  .catch((err) => next(err));
};
```

---

### 1.2 ML Services Authentication

#### API Key Authentication
**Status:** ✅ **IMPLEMENTED**

**How it works:**
```
ML Service Request → x-api-key header required
Gateway → ML Service: Includes API key
ML Service validates key → Process request
```

**Implementation Details:**
- **Header:** `x-api-key`
- **Storage:** Environment variables
- **Scope:** Per-service keys (Complaint ML, Identity Verifier, App Crawler)
- **Rotation:** Manual process

**Strengths:**
- ✅ Simple and efficient for service-to-service auth
- ✅ No complex handshake required
- ✅ Easy to implement and maintain

**Weaknesses:**
- ⚠️ Static keys - no automatic rotation
- ⚠️ If key leaks, entire service is compromised
- ⚠️ No fine-grained access control
- ⚠️ No request signing or integrity verification
- ⚠️ Keys in environment variables (risk if not properly secured)

---

### 1.3 Role-Based Access Control (RBAC)

**Status:** ✅ **IMPLEMENTED**

**Supported Roles:**
- `user` - Standard user (file grievances, view own data)
- `official` - Government official (verified identity required)
- `staff` - Support staff (handle grievances)
- `admin` - System administrator (full access)

**Implementation:**
```javascript
// Example: Admin-only endpoint
router.patch('/:grievanceId/assign',
  auth('admin'), // Requires admin role
  grievanceController.assignGrievance
);

// Example: Multiple role support
router.patch('/:grievanceId/status',
  auth('admin', 'staff'), // Admin OR staff
  grievanceController.updateStatus
);
```

**Strengths:**
- ✅ Clear role hierarchy
- ✅ Enforced at route level
- ✅ Extensible for new roles

**Weaknesses:**
- ⚠️ No attribute-based access control (ABAC)
- ⚠️ No resource-level permissions (e.g., "can only edit own grievances")
- ⚠️ No permission inheritance or groups

---

## 2. Security Gap Analysis

### 2.1 Missing Security Features

| Feature | Current Status | Priority | Complexity |
|---------|---------------|----------|------------|
| **OAuth 2.0 / OIDC** | ❌ Not Implemented | HIGH | Medium |
| **Mutual TLS (mTLS)** | ❌ Not Implemented | MEDIUM | High |
| **API Key Rotation** | ❌ Manual Only | HIGH | Low |
| **Rate Limiting** | ✅ Basic (express-rate-limit) | MEDIUM | Low |
| **IP Whitelisting** | ❌ Not Implemented | LOW | Low |
| **Request Signing** | ❌ Not Implemented | MEDIUM | Medium |
| **Multi-Factor Auth (MFA)** | ❌ Not Implemented | HIGH | Medium |
| **Audit Logging** | ✅ Partial (correlation IDs) | MEDIUM | Low |
| **Encryption at Rest** | ⚠️ Database dependent | HIGH | Low |
| **Encryption in Transit** | ✅ HTTPS (production) | HIGH | - |

---

## 3. Threat Model

### 3.1 Current Threats & Mitigations

#### Threat: JWT Token Theft
- **Risk Level:** HIGH
- **Current Mitigation:** Short-lived tokens (30 min), HTTPS only
- **Recommended Enhancement:**
  - ✅ Implement token binding (device fingerprinting)
  - ✅ Add IP address tracking
  - ✅ Implement anomaly detection (unusual location/device)

#### Threat: API Key Exposure
- **Risk Level:** HIGH
- **Current Mitigation:** Environment variables, internal network only
- **Recommended Enhancement:**
  - ✅ Implement automatic key rotation (30-90 days)
  - ✅ Use secret management service (AWS Secrets Manager, HashiCorp Vault)
  - ✅ Add request rate limiting per key
  - ✅ Implement key scoping (read-only vs read-write)

#### Threat: Replay Attacks
- **Risk Level:** MEDIUM
- **Current Mitigation:** None
- **Recommended Enhancement:**
  - ✅ Add request timestamps
  - ✅ Implement nonce validation
  - ✅ Add request signing with HMAC

#### Threat: Man-in-the-Middle (MITM)
- **Risk Level:** MEDIUM (HIGH in production without HTTPS)
- **Current Mitigation:** HTTPS in production
- **Recommended Enhancement:**
  - ✅ Enforce HTTPS-only (HSTS headers)
  - ✅ Implement certificate pinning for critical endpoints
  - ✅ Consider mTLS for service-to-service communication

#### Threat: Privilege Escalation
- **Risk Level:** MEDIUM
- **Current Mitigation:** RBAC at route level
- **Recommended Enhancement:**
  - ✅ Implement resource-level permissions
  - ✅ Add permission auditing
  - ✅ Implement least privilege principle in code

---

## 4. Recommendations by Priority

### 🔴 HIGH PRIORITY (Implement Soon)

#### 4.1 Multi-Factor Authentication (MFA)
**Why:** Adds critical second layer of defense for user accounts

**Implementation Plan:**
1. Add TOTP (Time-based One-Time Password) support
2. Integrate with apps like Google Authenticator, Authy
3. Support SMS fallback for users without smartphones
4. Enforce MFA for admin and official roles

**Estimated Effort:** 2-3 weeks

**Libraries:**
- `speakeasy` - TOTP generation
- `qrcode` - QR code generation for setup

---

#### 4.2 API Key Rotation & Management
**Why:** Static keys are a security risk; automated rotation reduces exposure

**Implementation Plan:**
1. Implement key versioning (multiple active keys)
2. Add automatic rotation schedule (every 90 days)
3. Integrate with secret management service
4. Add key scoping and permissions
5. Implement key usage analytics

**Estimated Effort:** 1-2 weeks

**Technologies:**
- AWS Secrets Manager / Azure Key Vault
- HashiCorp Vault (self-hosted option)

---

#### 4.3 Enhanced Audit Logging
**Why:** Critical for compliance and incident response

**Implementation Plan:**
1. Log all authentication attempts (success/failure)
2. Log authorization failures
3. Log sensitive operations (role changes, data access)
4. Implement log aggregation and analysis
5. Set up alerts for suspicious patterns

**Estimated Effort:** 1 week

**Already Implemented:**
- ✅ Correlation IDs for request tracing
- ✅ Basic logging with Winston

**Enhancements Needed:**
- Add structured logging (JSON format)
- Implement log retention policy
- Add automated alerting

---

### 🟡 MEDIUM PRIORITY (Plan for Next Quarter)

#### 4.4 OAuth 2.0 / OpenID Connect (OIDC)
**Why:** Enables third-party authentication, single sign-on (SSO), and better user experience

**Use Cases:**
- "Login with Google"
- "Login with Aadhaar (India Stack)"
- Government SSO integration
- Enterprise customer SSO

**Implementation Plan:**
1. Add OAuth 2.0 provider support (Google, Microsoft, etc.)
2. Implement OIDC for identity verification
3. Support SAML 2.0 for enterprise SSO
4. Add social login options

**Estimated Effort:** 3-4 weeks

**Libraries:**
- `passport-google-oauth20`
- `passport-oauth2`
- `openid-client`

---

#### 4.5 Request Signing & Integrity Verification
**Why:** Prevents request tampering and replay attacks

**Implementation Plan:**
1. Implement HMAC-based request signing
2. Add timestamp validation (prevent replay)
3. Add nonce tracking for critical operations
4. Document signing algorithm for clients

**Estimated Effort:** 1-2 weeks

**Algorithm:**
```
Signature = HMAC-SHA256(
  secret_key,
  HTTP_METHOD + "\n" +
  REQUEST_PATH + "\n" +
  TIMESTAMP + "\n" +
  REQUEST_BODY_HASH
)
```

---

#### 4.6 Mutual TLS (mTLS) for Service-to-Service
**Why:** Strongest authentication for microservices, prevents service impersonation

**Use Cases:**
- API Gateway ↔ ML Services
- Internal microservice communication
- High-security environments

**Implementation Plan:**
1. Set up certificate authority (CA)
2. Generate client certificates for each service
3. Configure Nginx/reverse proxy for mTLS
4. Implement certificate rotation
5. Add certificate revocation checking

**Estimated Effort:** 2-3 weeks

**Complexity:** High (requires infrastructure changes)

---

### 🟢 LOW PRIORITY (Future Enhancements)

#### 4.7 IP Whitelisting
**Why:** Additional layer for admin/critical endpoints

**Implementation:** 
- Environment-based whitelist
- Dynamic whitelist in database
- Geographic restrictions

**Estimated Effort:** 3-5 days

---

#### 4.8 Biometric Authentication
**Why:** Leverage existing identity verification for login

**Use Cases:**
- Face recognition login
- Voice authentication
- Fingerprint (mobile apps)

**Estimated Effort:** 4-6 weeks (depends on mobile app development)

---

## 5. Current Security Posture: Is API Key Sufficient?

### For ML Services (Internal): **YES, but with improvements**

API keys are **sufficient** for internal service-to-service communication **IF**:
- ✅ Keys are rotated regularly (every 90 days)
- ✅ Keys are stored securely (secret manager, not .env files in repo)
- ✅ Network is isolated (VPC/private network)
- ✅ Rate limiting is enforced per key
- ✅ Audit logging tracks all key usage

**Recommendation:** Keep API keys for ML services, but **enhance with**:
1. Automatic rotation
2. Secret management service
3. Key scoping (read-only vs full access)
4. Rate limiting per key

**Consider mTLS if:**
- Deploying across multiple clouds/regions
- Regulatory compliance requires certificate-based auth
- Zero-trust architecture is required

---

### For External APIs (Public): **NO, needs enhancement**

For external-facing APIs, API keys alone are **NOT sufficient**. Should add:
- ✅ OAuth 2.0 for third-party developers
- ✅ Rate limiting per client/organization
- ✅ Request signing for critical operations
- ✅ Webhook signature verification

---

## 6. Security Checklist for Production

### Authentication
- [ ] All passwords hashed with bcrypt (>= 12 rounds)
- [ ] JWT secrets are cryptographically strong (>= 256 bits)
- [ ] Refresh tokens stored securely with expiry
- [ ] Token blacklist implemented for logout
- [ ] MFA enabled for admin accounts
- [ ] Account lockout after failed login attempts

### Authorization
- [ ] RBAC enforced on all protected routes
- [ ] Resource-level permissions checked
- [ ] Principle of least privilege applied
- [ ] Permission changes audited

### Network Security
- [ ] HTTPS enforced (HSTS enabled)
- [ ] TLS 1.2+ only (no TLS 1.0/1.1)
- [ ] Certificate pinning for critical connections
- [ ] CORS properly configured
- [ ] CSP headers implemented

### API Security
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all requests
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled
- [ ] CSRF tokens for state-changing operations
- [ ] File upload size limits enforced
- [ ] File type validation implemented

### Data Security
- [ ] Sensitive data encrypted at rest
- [ ] PII data anonymized in logs
- [ ] Database backups encrypted
- [ ] Secure deletion implemented (GDPR compliance)

### Monitoring & Incident Response
- [ ] Centralized logging implemented
- [ ] Security alerts configured
- [ ] Anomaly detection enabled
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled

---

## 7. Implementation Roadmap

### Phase 1: Immediate (Month 1)
1. ✅ Implement API key rotation mechanism
2. ✅ Enhance audit logging
3. ✅ Add rate limiting to all endpoints
4. ✅ Set up secret management service
5. ✅ Enable HSTS headers

### Phase 2: Short-term (Month 2-3)
1. ✅ Implement MFA for admin/official accounts
2. ✅ Add OAuth 2.0 support (Google, Microsoft)
3. ✅ Implement request signing for critical endpoints
4. ✅ Add IP whitelisting for admin endpoints
5. ✅ Set up security monitoring dashboard

### Phase 3: Medium-term (Month 4-6)
1. ✅ Evaluate and implement mTLS for service-to-service
2. ✅ Add OIDC support for SSO
3. ✅ Implement advanced threat detection
4. ✅ Add biometric authentication option
5. ✅ Conduct external security audit

---

## 8. Compliance Considerations

### GDPR (General Data Protection Regulation)
- Right to erasure (delete user data)
- Data portability
- Consent management
- Breach notification (72 hours)

### India IT Act & Digital Personal Data Protection Act (DPDPA) 2023
- User consent for data collection
- Data localization requirements
- Security safeguards for sensitive data
- Notification of data breaches

### PCI DSS (if handling payments)
- Not currently applicable
- Future consideration if payment integration added

---

## 9. Conclusion

### Current State: **MODERATE SECURITY**
The Trilokan platform has a **solid foundation** with JWT authentication, RBAC, and API key-based service authentication.

### Immediate Needs:
1. **API Key Rotation** - Critical for long-term security
2. **MFA for Admins** - Prevent account takeover
3. **Enhanced Logging** - Required for compliance and incident response

### Long-term Vision:
- OAuth/OIDC for seamless third-party integration
- mTLS for zero-trust architecture
- AI-powered threat detection

### Recommendation: **Proceed with phased implementation**
- API keys are sufficient for internal ML services **with enhancements**
- External APIs should adopt OAuth 2.0 for better developer experience
- mTLS is optional but recommended for high-security deployments

---

## 10. Resources & References

### Documentation
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

### Tools
- [Passport.js](http://www.passportjs.org/) - Current auth library
- [HashiCorp Vault](https://www.vaultproject.io/) - Secret management
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing

### Monitoring
- Prometheus + Grafana (already integrated)
- ELK Stack for log analysis
- Sentry for error tracking

---

**Document Owner:** Security Team  
**Review Cycle:** Quarterly  
**Next Review:** February 2026
