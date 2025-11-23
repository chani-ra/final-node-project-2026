import jwt from 'jsonwebtoken';

export const TokenService = {
    generateAccessToken: (userId, role = null) => {
        return jwt.sign(
            { userId, role, type: 'access' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
    },

    generateRefreshToken: (userId) => {
        return jwt.sign(
            { userId, type: 'refresh' }, 
            process.env.REFRESH_SECRET || process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );
    },

    verifyToken: (token, type = 'access') => {
        const secret = type === 'refresh' 
            ? (process.env.REFRESH_SECRET || process.env.JWT_SECRET)
            : process.env.JWT_SECRET;
            
        return jwt.verify(token, secret);
    },

    generateTokenPair: (userId, role = null) => {
        return {
            accessToken: TokenService.generateAccessToken(userId, role),
            refreshToken: TokenService.generateRefreshToken(userId)
        };
    }
};

export default TokenService;