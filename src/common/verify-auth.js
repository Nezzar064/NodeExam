const jwt = require('jsonwebtoken');
const fs = require('fs');

const {logger} = require('./log');
const {AppError} = require("../error");
const publicKey = fs.readFileSync('public-key.pem');

const moduleName = 'verify-auth.js -';

// JWT Verification
module.exports.verifyToken = () => {
    return async (req, res, next) => {
        const token = getJwt(req);

        // Return 403 if token is not provided
        if (!token) {
            logger.error(`${moduleName} no token provided`);
            throw new AppError('No token was provided', 403, true);
        }

        // Verify token
        const decoded = await jwt.verify(token, publicKey, {algorithms: [process.env.KEY_ALGORITHM]});
        if (!decoded) {
            logger.error(`${moduleName} token is invalid`);
            throw new AppError('Token not valid - Unauthorized!', 401, true);
        }

        req.roles = decoded.roles;
        req.userId = decoded._id;
        req.employeeId = decoded.employeeId;

        logger.info(`${moduleName} Token successfully verified, user ${decoded.userId}, employee ${decoded.employeeId}`);
        return next();
    };
};


// Admin guard
module.exports.adminGuard = (req, res, next) => {
    for (let i = 0; i < req.roles.length; i++) {
        if (req.roles[i].name.toLowerCase() === 'admin') {
            logger.debug(`${moduleName} adminGuard / user authorized to access this resource`);
            next();
            return;
        }
    }
    logger.debug(`${moduleName} adminGuard / user not authorized to access this resource`);
    throw new AppError('Admin role required - Unauthorized!', 401, true);
};

// Mod guard
module.exports.modGuard = (req, res, next) => {
    for (let i = 0; i < req.roles.length; i++) {
        if (req.roles[i].name.toLowerCase() === 'moderator') {
            logger.debug(`${moduleName} modGuard / user authorized to access this resource`);
            next();
            return;
        }
    }
    logger.debug(`${moduleName} modGuard / user not authorized to access this resource`);
    throw new AppError('Mod role required - Unauthorized!', 403, true);
};

const getJwt = (req) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    }
    else if (req.query && req.query.token) {
        return req.query.token;
    }
    return null;
};
