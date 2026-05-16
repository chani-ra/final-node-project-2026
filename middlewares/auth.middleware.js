import TokenService from '../service/token.service.js';
import UserService from '../service/users.service.js'; 

export const authenticateToken = async (req, res, next) => {
    try {
        console.log('🔐 [authenticateToken] Headers:', req.headers.authorization ? '✅ Token present' : '❌ No auth header');
        const { authorization } = req.headers;       
        const token = authorization?.startsWith('Bearer ')
            ? authorization.slice(7)
            : null;
        
        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({
                message: !authorization
                    ? 'Authorization header is required'
                    : 'Invalid authorization format. Use: Bearer <token>'
            });
        }

        // Verify token עם השירות שלנו
        const decoded = TokenService.verifyToken(token, 'access');        // בדיקת סוג טוקן - הגנה מפני שימוש ב-refresh token
        if (decoded.type !== 'access') {
            console.log('❌ Invalid token type');
            return res.status(401).json({ message: 'Invalid token type' });
        }

        // בדיקה אופציונלית - רק אם צריך אבטחה מוגברת
        // const user = await UserService.getUserById(decoded.userId);
        // if (!user) {
        //     return res.status(401).json({ message: 'User no longer exists' });
        // }

        // שמירת מידע המשתמש מהטוקן (יעיל יותר)
        req.user = {
            id: decoded.userId,
            role: decoded.role
        };
        console.log('✅ [authenticateToken] User authenticated:', { id: req.user.id, role: req.user.role });

        next();
    } 
    catch (error) {
        console.log('❌ [authenticateToken] Error:', error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(500).json({ message: 'Authentication error', error: error.message });
    }
};

// Role-based middleware
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        console.log(`👤 [requireRole] Checking roles. Required: ${allowedRoles.join(', ')}, User role: ${req.user?.role}`);
        if (!req.user) {
            console.log('❌ [requireRole] No user in request');
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            console.log(`❌ [requireRole] User role "${req.user.role}" not in allowed roles: ${allowedRoles.join(', ')}`);
            return res.status(403).json({
                message: `Access denied. Requires one of: ${allowedRoles.join(', ')}`
            });
        }

        console.log(`✅ [requireRole] User role authorized`);
        next();
    };
};

// Specific role middleware for convenience
export const requireAdmin = requireRole(['admin']);
export const requireTeacher = requireRole(['teacher', 'admin']);
export const requireUser = requireRole(['user', 'teacher', 'admin']);

export default {
    authenticateToken,
    requireRole,
    requireAdmin,
    requireTeacher,
    requireUser
};
