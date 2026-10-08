import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    throw new Error('MONGODB_URI manquant dans .env');
}

const config = {
    developement: {
        type: 'developement',
        port: 3001,
        mongodb: mongoUri,
        database: 'my_social_networks'
    },

    production: {
        type: 'production',
        port: 3001,
        mongodb: mongoUri,
        database: 'my_social_networks'
    }
};

export default config;