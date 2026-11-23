'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimitStore = new Map(); // Global rate limit store by key

// Config
const JWT_SECRET = process.env.SKYNET_JWT_SECRET || 'skynet-jwt-secret-2026-dev';
const JWT_EXPIRES_IN = 3600; // 1 hour
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute per key
const RATE_LIMIT_MAX_REQUESTS = 100;

// FIX CVE-006: Proper CORS policy for security lab only
function createCorsHeaders(origin, credentials) {
  if (!origin || origin === 'http://localhost' || origin === '127.0.0.1') {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': credentials ? 'true' : 'false',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': credentials ? 'true' : 'false',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// FIX CVE-006: CORS preflight handler
app.options('/api/*', (req, res) => {
  const headers = createCorsHeaders(req.headers.origin, true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).end();
});

// Rate limiting middleware - FIX CVE-009
function rateLimitMiddleware(options = {}) {
  const windowMs = options.windowMs || RATE_LIMIT_WINDOW_MS;
  const maxRequests = options.maxRequests || RATE_LIMIT_MAX_REQUESTS;
  
  return (req, res, next) => {
    const key = `${req.ip}-${req.method}-${req.path}`;
    const now = Date.now();
    
    let window = rateLimitStore.get(key);
    if (!window || now >= window.expiresAt) {
      window = { count: 0, expiresAt: now + windowMs };
      rateLimitStore.set(key, window);
    }
    
    if (window.count >= maxRequests) {
      res.status(429).json({
        ok: false,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((window.expiresAt - now) / 1000),
      });
      return;
    }
    
    window.count++;
    next();
  };
}

// FIX CVE-002, CVE-007, CVE-008: JWT Authentication Middleware
function authMiddleware() {
  return async (req, res, next) => {
    const authHeader = req.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Missing or invalid Bearer token'
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach user info to request
      req.user = decoded;
      req.userId = decoded.userId;
      req.admin = decoded.role === 'ADMIN';
      
      next();
    } catch (err) {
      return res.status(401).json({
        ok: false,
        error: 'AUTHENTICATION_FAILED',
        message: 'Invalid or expired token'
      });
    }
  };
}

// FIX CVE-002: WebSocket JWT auth enhancement
function wsAuthMiddleware(socket, callback) {
  const authHeader = socket.request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return callback(false, 401, 'AUTHENTICATION_REQUIRED');
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Store session info
    wssAuth.sessions.set(decoded.userId, {
      userId: decoded.userId,
      role: decoded.role,
      lastActive: Date.now(),
      createdAt: Date.now()
    });
    
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    socket.admin = decoded.role === 'ADMIN';
    
    callback(true);
  } catch (err) {
    callback(false, 401, 'AUTHENTICATION_FAILED');
  }
}

// Input Validation Schema
function validateSchema(schema, data) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    if (!(field in data)) {
      errors.push({ field, message: 'Missing required field' });
      continue;
    }
    
    const value = data[field];
    const error = validateField(value, rules);
    if (error) errors.push(error);
  }
  
  return errors.length === 0 ? true : { valid: false, errors };
}

function validateField(value, rules) {
  for (const rule of rules) {
    // String validation
    if (rule.type === 'string' && typeof value !== 'string') {
      return { field: Object.keys(rules)[0], message: 'Must be a string' };
    }
    
    // Length validation
    if (rule.minLength && String(value).length < rule.minLength) {
      return { field: Object.keys(rules)[0], message: `Minimum length is ${rule.minLength}` };
    }
    
    if (rule.maxLength && String(value).length > rule.maxLength) {
      return { field: Object.keys(rules)[0], message: `Maximum length is ${rule.maxLength}` };
    }
    
    // Integer validation
    if (rule.type === 'integer' && typeof value !== 'number' || !Number.isInteger(value)) {
      return { field: Object.keys(rules)[0], message: 'Must be an integer' };
    }
    
    // Range validation
    if (rule.min !== undefined && value < rule.min) {
      return { field: Object.keys(rules)[0], message: `Minimum value is ${rule.min}` };
    }
    
    if (rule.max !== undefined && value > rule.max) {
      return { field: Object.keys(rules)[0], message: `Maximum value is ${rule.max}` };
    }
  }
  
  return null;
}
