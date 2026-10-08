
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';

import auth from '../middlewares/auth.mjs';
import { UserSchema } from '../models/social.mjs';

export default class Users {
    constructor(app, connection) {
        this.app = app;
        this.Model =
            connection.models.User ||
            connection.model('User', UserSchema);

        this.registerRoutes();
    }

    registerRoutes() {
        const app = this.app;

        const validate = (req, res, next) => {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation error',
                    errors: errors.array().map(error => ({
                        field: error.path,
                        message: error.msg
                    }))
                });
            }

            next();
        };

        const registrationRules = [
            body('firstname')
                .isString()
                .trim()
                .notEmpty()
                .withMessage('Firstname is required'),

            body('lastname')
                .isString()
                .trim()
                .notEmpty()
                .withMessage('Lastname is required'),

            body('email')
                .isEmail()
                .withMessage('Valid email required')
                .normalizeEmail(),

            body('password')
                .isString()
                .isLength({ min: 8 })
                .withMessage('Password must contain at least 8 characters')
        ];

        // INSCRIPTION
        app.post(
            '/users',
            registrationRules,
            validate,
            async (req, res) => {
                try {
                    const {
                        firstname,
                        lastname,
                        email,
                        password
                    } = req.body;

                    const existingUser = await this.Model.findOne({
                        email
                    });

                    if (existingUser) {
                        return res.status(409).json({
                            message: 'Email already registered'
                        });
                    }

                    const hashedPassword = await bcrypt.hash(
                        password,
                        10
                    );

                    const user = await this.Model.create({
                        firstname,
                        lastname,
                        email,
                        password: hashedPassword
                    });

                    res.status(201).json({
                        _id: user._id,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        email: user.email
                    });

                } catch (error) {
                    if (error.code === 11000) {
                        return res.status(409).json({
                            message: 'Email already registered'
                        });
                    }

                    console.error(error);

                    res.status(500).json({
                        message: 'Internal server error'
                    });
                }
            }
        );

        // CONNEXION JWT
        app.post(
            '/login',
            [
                body('email')
                    .isEmail()
                    .normalizeEmail()
                    .withMessage('Valid email required'),

                body('password')
                    .isString()
                    .notEmpty()
                    .withMessage('Password required')
            ],
            validate,
            async (req, res) => {
                try {
                    const user = await this.Model.findOne({
                        email: req.body.email
                    }).select('+password');

                    if (!user) {
                        return res.status(401).json({
                            message: 'Invalid email or password'
                        });
                    }

                    const passwordValid = await bcrypt.compare(
                        req.body.password,
                        user.password
                    );

                    if (!passwordValid) {
                        return res.status(401).json({
                            message: 'Invalid email or password'
                        });
                    }

                    if (!process.env.JWT_SECRET) {
                        console.error('JWT_SECRET missing');

                        return res.status(500).json({
                            message: 'Internal server error'
                        });
                    }

                    const token = jwt.sign(
                        {
                            userId: user._id.toString(),
                            email: user.email
                        },
                        process.env.JWT_SECRET,
                        {
                            expiresIn: '1h'
                        }
                    );

                    res.status(200).json({
                        message: 'Login successful',
                        token,
                        user: {
                            _id: user._id,
                            firstname: user.firstname,
                            lastname: user.lastname,
                            email: user.email
                        }
                    });

                } catch (error) {
                    console.error(error);

                    res.status(500).json({
                        message: 'Internal server error'
                    });
                }
            }
        );

        // PROFIL CONNECTÉ
        app.get('/users/me', auth, async (req, res) => {
            try {
                const user = await this.Model.findById(
                    req.user.userId
                );

                if (!user) {
                    return res.status(404).json({
                        message: 'User not found'
                    });
                }

                res.status(200).json(user);

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    message: 'Internal server error'
                });
            }
        });

        // LISTE DES UTILISATEURS
        app.get('/users', auth, async (req, res) => {
            try {
                const users = await this.Model.find();

                res.status(200).json(users);

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    message: 'Internal server error'
                });
            }
        });

        // UTILISATEUR PAR ID
        app.get('/users/:id', auth, async (req, res) => {
            try {
                if (!mongoose.isValidObjectId(req.params.id)) {
                    return res.status(400).json({
                        message: 'Invalid user ID'
                    });
                }

                const user = await this.Model.findById(
                    req.params.id
                );

                if (!user) {
                    return res.status(404).json({
                        message: 'User not found'
                    });
                }

                res.status(200).json(user);

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    message: 'Internal server error'
                });
            }
        });
    }
}
