// Auth middleware

// API-specific middleware
export { authenticateApplicationUser } from './api/application/authenticateApplicationUser.js';
export { authenticateServerAccess } from './api/client/server/authenticateServerAccess.js';
export { resourceBelongsToServer } from './api/client/server/resourceBelongsToServer.js';
export { daemonAuthenticate } from './api/daemon/daemonAuthenticate.js';
export { authenticateIPAccess } from './auth/authenticateIPAccess.js';
export { requireTwoFactor } from './auth/requireTwoFactor.js';
export { sanctumAuth } from './auth/sanctumAuth.js';
export { csrfProtection } from './common/csrf.js';
// Common middleware
export { errorHandler } from './common/errorHandler.js';
export {
    applicationRateLimit,
    authRateLimit,
    clientRateLimit,
    passwordResetRateLimit,
} from './common/rateLimiter.js';
export { setSecurityHeaders } from './common/setSecurityHeaders.js';
