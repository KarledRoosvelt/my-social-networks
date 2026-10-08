
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import https from 'https';
import fs from 'fs';

import config from './config.mjs';
import routes from './src/controllers/routes.mjs';

class Server {
    constructor() {
        this.app = express();
        this.config = config[process.argv[2]] || config.developement;
    }

    async dbConnect() {
        this.connect = await mongoose.createConnection(
            this.config.mongodb,
            {
                dbName: this.config.database
            }
        ).asPromise();

        console.log(
            `MongoDB connected: ${this.config.database}`
        );
    }

    middleware() {
        this.app.use(helmet());

        // Autoriser uniquement l'origine configurÃ©e.
        // Les requÃªtes sans Origin (ex. Postman) restent possibles.
        const allowedOrigin =
            process.env.CORS_ORIGIN || 'https://localhost:3001';

        this.app.use(cors({
            origin: allowedOrigin
        }));

        this.app.use(rateLimit({
            windowMs: 60 * 60 * 1000,
            limit: 100,
            standardHeaders: 'draft-8',
            legacyHeaders: false,
            message: {
                code: 429,
                message: 'Too many requests'
            }
        }));

        this.app.use(express.json({
            limit: '1mb'
        }));

        this.app.use(express.urlencoded({
            extended: true
        }));
    }

    routes() {
        // ContrÃ´leurs existants, remplacÃ©s progressivement
        // par ceux du nouveau TP.
     new routes.Users(this.app, this.connect);
new routes.Social(this.app, this.connect);
new routes.SocialExtra(this.app, this.connect);
        new routes.SocialRead(this.app, this.connect);
        this.app.get('/', (req, res) => {
            res.status(200).json({
                message: 'My Social Networks API',
                status: 'running'
            });
        });

        this.app.use((req, res) => {
            res.status(404).json({
                code: 404,
                message: 'Route not found'
            });
        });

        this.app.use((err, req, res, next) => {
            console.error(err);

            res.status(500).json({
                code: 500,
                message: 'Internal server error'
            });
        });
    }

    async run() {
        try {
            await this.dbConnect();

            this.middleware();
            this.routes();

            const httpsOptions = {
                key: fs.readFileSync(
                    './certificates/key.pem'
                ),
                cert: fs.readFileSync(
                    './certificates/cert.pem'
                )
            };

            https.createServer(
                httpsOptions,
                this.app
            ).listen(this.config.port, () => {
                console.log(
                    `My Social Networks API running on https://localhost:${this.config.port}`
                );
            });

        } catch (error) {
            console.error(
                'Server startup failed:',
                error.message
            );
            process.exitCode = 1;
        }
    }
}

export default Server;

