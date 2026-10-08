import { Schema } from 'mongoose';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    firstname: {
        type: String,
        required: true,
        trim: true
    },

    lastname: {
        type: String,
        required: true,
        trim: true
    },

    age: {
        type: Number,
        required: true,
        min: 0,
        max: 99
    },

    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },

    password: {
        type: String,
        required: true
    }
});

const Users = class Users {
    constructor(app, connection){
        this.app = app;
        this.connection = connection;
        this.Model = this.connection.model('User', userSchema);
        this.run();
    }

    // Création d'un utilisateur
    putUser() {
        this.app.post(
            '/users',
            [
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

                body('age')
                    .isInt({ min: 0, max: 99 })
                    .withMessage('Age must be between 0 and 99')
                    .toInt(),

                body('username')
                    .isString()
                    .trim()
                    .isLength({ min: 3 })
                    .withMessage('Username must contain at least 3 characters'),

                body('password')
                    .isString()
                    .isLength({ min: 8 })
                    .withMessage('Password must contain at least 8 characters')
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);

                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            code: 400,
                            message: 'Validation Error',
                            errors: errors.array()
                        });
                    }

                    const existingUser = await this.Model.findOne({
                        username: req.body.username
                    });

                    if (existingUser) {
                        return res.status(409).json({
                            code: 409,
                            message: 'Username already exists'
                        });
                    }

                    const hashedPassword = await bcrypt.hash(
                        req.body.password,
                        10
                    );

                    const user = await this.Model.create({
                        firstname: req.body.firstname,
                        lastname: req.body.lastname,
                        age: req.body.age,
                        username: req.body.username,
                        password: hashedPassword
                    });

                    res.status(201).json({
                        _id: user._id,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        age: user.age,
                        username: user.username
                    });

                } catch (error) {
                    console.error(error);

                    res.status(500).json({
                        code: 500,
                        message: 'Internal server error'
                    });
                }
            }
        );
    }

    // Connexion et génération du JWT
    login() {
        this.app.post(
            '/login',
            [
                body('username')
                    .isString()
                    .trim()
                    .notEmpty()
                    .withMessage('Username is required'),

                body('password')
                    .isString()
                    .notEmpty()
                    .withMessage('Password is required')
            ],
            async (req, res) => {
                try {
                    const errors = validationResult(req);

                    if (!errors.isEmpty()) {
                        return res.status(400).json({
                            code: 400,
                            message: 'Validation Error',
                            errors: errors.array()
                        });
                    }

                    const user = await this.Model.findOne({
                        username: req.body.username
                    });

                    if (!user) {
                        return res.status(401).json({
                            code: 401,
                            message: 'Invalid username or password'
                        });
                    }

                    const validPassword = await bcrypt.compare(
                        req.body.password,
                        user.password
                    );

                    if (!validPassword) {
                        return res.status(401).json({
                            code: 401,
                            message: 'Invalid username or password'
                        });
                    }

                    if (!process.env.JWT_SECRET) {
                        console.error('JWT_SECRET is missing');

                        return res.status(500).json({
                            code: 500,
                            message: 'Internal server error'
                        });
                    }

                    const token = jwt.sign(
                        {
                            userId: user._id,
                            username: user.username
                        },
                        process.env.JWT_SECRET,
                        {
                            expiresIn: '1h'
                        }
                    );

                    res.status(200).json({
                        message: 'Login successful',
                        token: token
                    });

                } catch (error) {
                    console.error(error);

                    res.status(500).json({
                        code: 500,
                        message: 'Internal server error'
                    });
                }
            }
        );
    }

    getUsers(){
        this.app.get('/users', async (req, res) => {
            try {
                const users = await this.Model
                    .find()
                    .select('-password');

                res.status(200).json(users);

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    code: 500,
                    message: 'Internal server error'
                });
            }
        });
    }

    getUserByID(){
        this.app.get('/users/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const user = await this.Model
                    .findById(id)
                    .select('-password');

                if (!user) {
                    return res.status(404).json({
                        code: 404,
                        message: 'User not found'
                    });
                }

                res.status(200).json(user);

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    code: 500,
                    message: 'Internal server error'
                });
            }
        });
    }

    updateFirstnameByID() {
        this.app.patch('/users/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const newFirstName = req.body.firstname;

                const user = await this.Model.findByIdAndUpdate(
                    id,
                    {
                        firstname: newFirstName
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                ).select('-password');

                if (!user) {
                    return res.status(404).json({
                        code: 404,
                        message: 'User not found'
                    });
                }

                res.status(200).json({
                    user: user
                });

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    code: 500,
                    message: 'Internal server error'
                });
            }
        });
    }

    updateUserByID() {
        this.app.put('/users/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const updateData = {
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    age: req.body.age,
                    username: req.body.username
                };

                if (req.body.password) {
                    updateData.password = await bcrypt.hash(
                        req.body.password,
                        10
                    );
                }

                const user = await this.Model.findByIdAndUpdate(
                    id,
                    updateData,
                    {
                        new: true,
                        runValidators: true
                    }
                ).select('-password');

                if (!user) {
                    return res.status(404).json({
                        code: 404,
                        message: 'User not found'
                    });
                }

                res.status(200).json({
                    user: user
                });

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    code: 500,
                    message: 'Internal server error'
                });
            }
        });
    }

    deleteUserByID(){
        this.app.delete('/users/:id', async (req, res) => {
            try {
                const id = req.params.id;

                const user = await this.Model.findByIdAndDelete(id);

                if (!user) {
                    return res.status(404).json({
                        code: 404,
                        message: 'User not found'
                    });
                }

                res.status(200).json({
                    message: 'User deleted'
                });

            } catch (error) {
                console.error(error);

                res.status(500).json({
                    code: 500,
                    message: 'Internal server error'
                });
            }
        });
    }

    run(){
        this.getUsers();
        this.putUser();
        this.login();
        this.getUserByID();
        this.deleteUserByID();
        this.updateFirstnameByID();
        this.updateUserByID();
    }
};

export default Users;