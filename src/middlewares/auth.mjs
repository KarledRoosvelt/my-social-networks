import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
    try {
        const authorizationHeader = req.headers.authorization;

        // Aucun token fourni
        if (!authorizationHeader) {
            return res.status(401).json({
                code: 401,
                message: 'Authentication token required'
            });
        }

        // Format attendu : Bearer TOKEN
        const parts = authorizationHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
            return res.status(401).json({
                code: 401,
                message: 'Invalid authorization format'
            });
        }

        const token = parts[1];

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is missing');

            return res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        }

        // Vérification du JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Informations de l'utilisateur disponibles pour la route suivante
        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            code: 401,
            message: 'Invalid or expired token'
        });
    }
};

export default auth;