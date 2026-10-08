
import mongoose from 'mongoose';

const { Schema } = mongoose;

const userId = {
    type: Schema.Types.ObjectId,
    ref: 'User'
};

// =====================================================
// UTILISATEURS
// =====================================================

export const UserSchema = new Schema({
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
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    }
}, { timestamps: true });

// =====================================================
// GROUPES
// =====================================================

export const GroupSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    icon: String,
    coverPhoto: String,

    visibility: {
        type: String,
        enum: ['public', 'private', 'secret'],
        default: 'public'
    },

    allowMemberPosts: {
        type: Boolean,
        default: true
    },

    allowMemberEvents: {
        type: Boolean,
        default: false
    },

    administrators: {
        type: [userId],
        validate: {
            validator: value => value.length > 0,
            message: 'At least one administrator is required'
        }
    },

    members: [userId]
}, { timestamps: true });

// =====================================================
// EVENEMENTS
// =====================================================

export const EventSchema = new Schema({
    name: {
        type: String,
        required: true
    },

    description: String,

    startDate: {
        type: Date,
        required: true
    },

    endDate: {
        type: Date,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    coverPhoto: String,

    isPrivate: {
        type: Boolean,
        default: false
    },

    organizers: {
        type: [userId],
        validate: {
            validator: value => value.length > 0,
            message: 'At least one organizer is required'
        }
    },

    participants: [userId],

    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group'
    }
}, { timestamps: true });

// =====================================================
// DISCUSSIONS
// =====================================================

export const DiscussionSchema = new Schema({
    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group'
    },

    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event'
    },

    messages: [{
        author: userId,

        content: {
            type: String,
            required: true
        },

        replies: [{
            author: userId,

            content: {
                type: String,
                required: true
            },

            createdAt: {
                type: Date,
                default: Date.now
            }
        }],

        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// =====================================================
// ALBUMS PHOTO
// =====================================================

export const AlbumSchema = new Schema({
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },

    title: {
        type: String,
        required: true
    },

    photos: [{
        url: {
            type: String,
            required: true
        },

        author: userId,

        comments: [{
            author: userId,

            content: {
                type: String,
                required: true
            }
        }]
    }]
}, { timestamps: true });

// =====================================================
// SONDAGES
// =====================================================

export const PollSchema = new Schema({
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },

    creator: userId,

    title: {
        type: String,
        required: true
    },

    questions: [{
        text: {
            type: String,
            required: true
        },

        options: [{
            type: String
        }],

        answers: [{
            user: userId,
            optionIndex: Number
        }]
    }]
}, { timestamps: true });

// =====================================================
// TYPES DE BILLETS
// =====================================================

export const TicketTypeSchema = new Schema({
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },

    name: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    }
}, { timestamps: true });

// =====================================================
// BILLETS ACHETES
// =====================================================

export const TicketSchema = new Schema({
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },

    ticketType: {
        type: Schema.Types.ObjectId,
        ref: 'TicketType',
        required: true
    },

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

    address: {
        type: String,
        required: true,
        trim: true
    },

    buyerEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },

    purchaseDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Un seul billet par acheteur et par evenement.
// La regle s'applique meme si les types de billets different.

TicketSchema.index(
    {
        event: 1,
        buyerEmail: 1
    },
    {
        unique: true
    }
);
