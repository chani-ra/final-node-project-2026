import TokenService from '../service/token.service.js';
import UserService from '../service/users.service.js';

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : null;

        if (!token) {
            return res.status(401).json({ message: 'Access token is required' });
        }

        // Verify token
        const decoded = TokenService.verifyToken(token, 'access');
        
        if (decoded.type !== 'access') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        // Get user from database to ensure they still exist
        const user = await UserService.getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Add user data to request object
        req.user = {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role
        };

        next();
    } catch (error) {
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
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Requires one of: ${allowedRoles.join(', ')}` 
            });
        }

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
