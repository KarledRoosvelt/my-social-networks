
import mongoose from 'mongoose';
import auth from '../middlewares/auth.mjs';

import {
    GroupSchema,
    EventSchema,
    DiscussionSchema,
    AlbumSchema,
    PollSchema,
    TicketTypeSchema,
    TicketSchema
} from '../models/social.mjs';

export default class Social {
    constructor(app, connection) {
        this.app = app;

        const model = (name, schema) =>
            connection.models[name] ||
            connection.model(name, schema);

        this.Group = model('Group', GroupSchema);
        this.Event = model('Event', EventSchema);
        this.Discussion = model('Discussion', DiscussionSchema);
        this.Album = model('SocialAlbum', AlbumSchema);
        this.Poll = model('Poll', PollSchema);
        this.TicketType = model('TicketType', TicketTypeSchema);
        this.Ticket = model('Ticket', TicketSchema);

        this.registerRoutes();
    }

    registerRoutes() {
        const app = this.app;
        const validId = id => mongoose.isValidObjectId(id);

        const fail = (res, error) => {
            console.error(error);
            return res.status(500).json({
                message: 'Internal server error'
            });
        };

        const requireFields = (body, fields) =>
            fields.every(field =>
                body[field] !== undefined &&
                body[field] !== null &&
                body[field] !== ''
            );

        // GROUPES
        app.post('/groups', auth, async (req, res) => {
            try {
                if (!requireFields(req.body, ['name'])) {
                    return res.status(400).json({
                        message: 'Group name is required'
                    });
                }

                const group = await this.Group.create({
                    name: req.body.name,
                    description: req.body.description,
                    icon: req.body.icon,
                    coverPhoto: req.body.coverPhoto,
                    visibility: req.body.visibility || 'public',
                    allowMemberPosts: req.body.allowMemberPosts,
                    allowMemberEvents: req.body.allowMemberEvents,
                    administrators: [req.user.userId],
                    members: [req.user.userId]
                });

                res.status(201).json(group);
            } catch (error) {
                fail(res, error);
            }
        });

        app.get('/groups', auth, async (req, res) => {
            try {
                const groups = await this.Group.find({
                    $or: [
                        { visibility: 'public' },
                        { members: req.user.userId },
                        { administrators: req.user.userId }
                    ]
                });

                res.json(groups);
            } catch (error) {
                fail(res, error);
            }
        });

        app.post('/groups/:id/join', auth, async (req, res) => {
            try {
                if (!validId(req.params.id)) {
                    return res.status(400).json({
                        message: 'Invalid group ID'
                    });
                }

                const group = await this.Group.findById(req.params.id);

                if (!group) {
                    return res.status(404).json({
                        message: 'Group not found'
                    });
                }

                if (group.visibility !== 'public') {
                    return res.status(403).json({
                        message: 'Invitation required'
                    });
                }

                await this.Group.updateOne(
                    { _id: group._id },
                    { $addToSet: { members: req.user.userId } }
                );

                res.json({ message: 'Group joined' });
            } catch (error) {
                fail(res, error);
            }
        });

        // Ã‰VÃ‰NEMENTS
        app.post('/events', auth, async (req, res) => {
            try {
                const b = req.body;

                if (!requireFields(b, [
                    'name', 'startDate', 'endDate', 'location'
                ])) {
                    return res.status(400).json({
                        message: 'Missing event fields'
                    });
                }

                const start = new Date(b.startDate);
                const end = new Date(b.endDate);

                if (
                    !Number.isFinite(start.getTime()) ||
                    !Number.isFinite(end.getTime()) ||
                    end <= start
                ) {
                    return res.status(400).json({
                        message: 'Invalid event dates'
                    });
                }

                if (b.group) {
                    if (!validId(b.group)) {
                        return res.status(400).json({
                            message: 'Invalid group ID'
                        });
                    }

                    const group = await this.Group.findById(b.group);

                    if (!group) {
                        return res.status(404).json({
                            message: 'Group not found'
                        });
                    }

                    const isAdmin = group.administrators.some(
                        id => String(id) === String(req.user.userId)
                    );

                    const isMember = group.members.some(
                        id => String(id) === String(req.user.userId)
                    );

                    if (!isAdmin && !(isMember && group.allowMemberEvents)) {
                        return res.status(403).json({
                            message: 'Not allowed to create group events'
                        });
                    }
                }

                const event = await this.Event.create({
                    name: b.name,
                    description: b.description,
                    startDate: start,
                    endDate: end,
                    location: b.location,
                    coverPhoto: b.coverPhoto,
                    isPrivate: b.isPrivate === true,
                    organizers: [req.user.userId],
                    participants: [req.user.userId],
                    group: b.group
                });

                res.status(201).json(event);
            } catch (error) {
                fail(res, error);
            }
        });

        app.get('/events', auth, async (req, res) => {
            try {
                const events = await this.Event.find({
                    $or: [
                        { isPrivate: false },
                        { organizers: req.user.userId },
                        { participants: req.user.userId }
                    ]
                });

                res.json(events);
            } catch (error) {
                fail(res, error);
            }
        });

        app.post('/events/:id/join', auth, async (req, res) => {
            try {
                if (!validId(req.params.id)) {
                    return res.status(400).json({
                        message: 'Invalid event ID'
                    });
                }

                const event = await this.Event.findById(req.params.id);

                if (!event) {
                    return res.status(404).json({
                        message: 'Event not found'
                    });
                }

                if (event.isPrivate) {
                    return res.status(403).json({
                        message: 'Invitation required'
                    });
                }

                await this.Event.updateOne(
                    { _id: event._id },
                    { $addToSet: { participants: req.user.userId } }
                );

                res.json({ message: 'Event joined' });
            } catch (error) {
                fail(res, error);
            }
        });

        // DISCUSSIONS
        app.post('/discussions', auth, async (req, res) => {
            try {
                const { group, event } = req.body;

                if (Boolean(group) === Boolean(event)) {
                    return res.status(400).json({
                        message: 'Choose exactly one group or event'
                    });
                }

                const target = group
                    ? await this.Group.findById(
                        validId(group) ? group : null
                    )
                    : await this.Event.findById(
                        validId(event) ? event : null
                    );

                if (!target) {
                    return res.status(404).json({
                        message: 'Group or event not found'
                    });
                }

                const allowed = group
                    ? [...target.members, ...target.administrators]
                    : [...target.participants, ...target.organizers];

                if (!allowed.some(
                    id => String(id) === String(req.user.userId)
                )) {
                    return res.status(403).json({
                        message: 'Membership required'
                    });
                }

                const discussion = await this.Discussion.create({
                    group,
                    event,
                    messages: []
                });

                res.status(201).json(discussion);
            } catch (error) {
                fail(res, error);
            }
        });

        app.post('/discussions/:id/messages', auth, async (req, res) => {
            try {
                if (!validId(req.params.id)) {
                    return res.status(400).json({
                        message: 'Invalid discussion ID'
                    });
                }

                if (
                    typeof req.body.content !== 'string' ||
                    !req.body.content.trim()
                ) {
                    return res.status(400).json({
                        message: 'Message content required'
                    });
                }

                const discussion = await this.Discussion.findById(
                    req.params.id
                );

                if (!discussion) {
                    return res.status(404).json({
                        message: 'Discussion not found'
                    });
                }

                const target = discussion.group
                    ? await this.Group.findById(discussion.group)
                    : await this.Event.findById(discussion.event);

                if (!target) {
                    return res.status(404).json({
                        message: 'Group or event not found'
                    });
                }

                const members = discussion.group
                    ? [...target.members, ...target.administrators]
                    : [...target.participants, ...target.organizers];

                if (!members.some(
                    id => String(id) === String(req.user.userId)
                )) {
                    return res.status(403).json({
                        message: 'Membership required'
                    });
                }

                if (discussion.group && !target.allowMemberPosts) {
                    const isAdmin = target.administrators.some(
                        id => String(id) === String(req.user.userId)
                    );

                    if (!isAdmin) {
                        return res.status(403).json({
                            message: 'Only administrators can post'
                        });
                    }
                }

                discussion.messages.push({
                    author: req.user.userId,
                    content: req.body.content.trim()
                });

                await discussion.save();
                res.status(201).json(discussion);
            } catch (error) {
                fail(res, error);
            }
        });

        // ALBUMS PHOTO
        app.post('/social-albums', auth, async (req, res) => {
            try {
                const { event, title } = req.body;

                if (!validId(event) || !title) {
                    return res.status(400).json({
                        message: 'Valid event and title required'
                    });
                }

                const eventDoc = await this.Event.findById(event);

                if (!eventDoc) {
                    return res.status(404).json({
                        message: 'Event not found'
                    });
                }

                const allowed = [
                    ...eventDoc.participants,
                    ...eventDoc.organizers
                ].some(id => String(id) === String(req.user.userId));

                if (!allowed) {
                    return res.status(403).json({
                        message: 'Event participation required'
                    });
                }

                const album = await this.Album.create({
                    event,
                    title,
                    photos: []
                });

                res.status(201).json(album);
            } catch (error) {
                fail(res, error);
            }
        });

        app.post('/social-albums/:id/photos', auth, async (req, res) => {
            try {
                if (!validId(req.params.id)) {
                    return res.status(400).json({
                        message: 'Invalid album ID'
                    });
                }

                const album = await this.Album.findById(req.params.id);

                if (!album) {
                    return res.status(404).json({
                        message: 'Album not found'
                    });
                }

                const event = await this.Event.findById(album.event);

                const allowed = event && [
                    ...event.participants,
                    ...event.organizers
                ].some(id => String(id) === String(req.user.userId));

                if (!allowed) {
                    return res.status(403).json({
                        message: 'Event participation required'
                    });
                }

                if (
                    typeof req.body.url !== 'string' ||
                    !/^https?:\/\/\S+$/i.test(req.body.url)
                ) {
                    return res.status(400).json({
                        message: 'Valid photo URL required'
                    });
                }

                album.photos.push({
                    url: req.body.url,
                    author: req.user.userId
                });

                await album.save();
                res.status(201).json(album);
            } catch (error) {
                fail(res, error);
            }
        });

        // SONDAGES
        app.post('/polls', auth, async (req, res) => {
            try {
                const { event, title, questions } = req.body;

                if (
                    !validId(event) ||
                    typeof title !== 'string' ||
                    !title.trim() ||
                    !Array.isArray(questions) ||
                    questions.length === 0 ||
                    !questions.every(q =>
                        typeof q.text === 'string' &&
                        q.text.trim() &&
                        Array.isArray(q.options) &&
                        q.options.length >= 2 &&
                        q.options.every(o =>
                            typeof o === 'string' && o.trim()
                        )
                    )
                ) {
                    return res.status(400).json({
                        message: 'Invalid poll data'
                    });
                }

                const eventDoc = await this.Event.findById(event);

                if (!eventDoc) {
                    return res.status(404).json({
                        message: 'Event not found'
                    });
                }

                if (!eventDoc.organizers.some(
                    id => String(id) === String(req.user.userId)
                )) {
                    return res.status(403).json({
                        message: 'Only organizers can create polls'
                    });
                }

                const poll = await this.Poll.create({
                    event,
                    creator: req.user.userId,
                    title,
                    questions
                });

                res.status(201).json(poll);
            } catch (error) {
                fail(res, error);
            }
        });

        app.post('/polls/:id/vote', auth, async (req, res) => {
            try {
                if (!validId(req.params.id)) {
                    return res.status(400).json({
                        message: 'Invalid poll ID'
                    });
                }

                const poll = await this.Poll.findById(req.params.id);

                if (!poll) {
                    return res.status(404).json({
                        message: 'Poll not found'
                    });
                }

                const event = await this.Event.findById(poll.event);

                if (!event || ![
                    ...event.participants,
                    ...event.organizers
                ].some(id => String(id) === String(req.user.userId))) {
                    return res.status(403).json({
                        message: 'Event participation required'
                    });
                }

                const { questionIndex, optionIndex } = req.body;

                if (
                    !Number.isInteger(questionIndex) ||
                    !Number.isInteger(optionIndex) ||
                    questionIndex < 0 ||
                    questionIndex >= poll.questions.length ||
                    optionIndex < 0 ||
                    optionIndex >= poll.questions[questionIndex].options.length
                ) {
                    return res.status(400).json({
                        message: 'Invalid question or option'
                    });
                }

                const question = poll.questions[questionIndex];

                if (question.answers.some(
                    answer => String(answer.user) === String(req.user.userId)
                )) {
                    return res.status(409).json({
                        message: 'Already voted on this question'
                    });
                }

                question.answers.push({
                    user: req.user.userId,
                    optionIndex
                });

                await poll.save();

                res.json({ message: 'Vote recorded' });
            } catch (error) {
                fail(res, error);
            }
        });

        // BILLETTERIE
        app.post('/ticket-types', auth, async (req, res) => {
            try {
                const { event, name, price, quantity } = req.body;

                if (
                    !validId(event) ||
                    typeof name !== 'string' ||
                    !name.trim() ||
                    typeof price !== 'number' ||
                    !Number.isFinite(price) ||
                    price < 0 ||
                    !Number.isInteger(quantity) ||
                    quantity < 1
                ) {
                    return res.status(400).json({
                        message: 'Invalid ticket type'
                    });
                }

                const eventDoc = await this.Event.findById(event);

                if (!eventDoc) {
                    return res.status(404).json({
                        message: 'Event not found'
                    });
                }

                if (
                    eventDoc.isPrivate ||
                    !eventDoc.organizers.some(
                        id => String(id) === String(req.user.userId)
                    )
                ) {
                    return res.status(403).json({
                        message: 'Public event organizer required'
                    });
                }

                const ticketType = await this.TicketType.create({
                    event,
                    name,
                    price,
                    quantity
                });

                res.status(201).json(ticketType);
            } catch (error) {
                fail(res, error);
            }
        });

        app.post('/tickets', async (req, res) => {
            try {
                const {
                    ticketType,
                    firstname,
                    lastname,
                    address,
                    buyerEmail
                } = req.body;

                if (
                    !validId(ticketType) ||
                    ![firstname, lastname, address, buyerEmail]
                        .every(v => typeof v === 'string' && v.trim()) ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)
                ) {
                    return res.status(400).json({
                        message: 'Invalid buyer information'
                    });
                }

                const type = await this.TicketType.findById(ticketType);

                if (!type) {
                    return res.status(404).json({
                        message: 'Ticket type not found'
                    });
                }

                const event = await this.Event.findById(type.event);

                if (!event || event.isPrivate) {
                    return res.status(403).json({
                        message: 'Public event required'
                    });
                }

                const email = buyerEmail.trim().toLowerCase();

                const existing = await this.Ticket.findOne({
                    event: type.event,
                    buyerEmail: email
                });

                if (existing) {
                    return res.status(409).json({
                        message: 'Buyer already has a ticket for this event'
                    });
                }

                const updatedType = await this.TicketType.findOneAndUpdate(
                    {
                        _id: ticketType,
                        quantity: { $gt: 0 }
                    },
                    { $inc: { quantity: -1 } },
                    { new: true }
                );

                if (!updatedType) {
                    return res.status(409).json({
                        message: 'Ticket unavailable'
                    });
                }

                try {
                    const ticket = await this.Ticket.create({
                        event: type.event,
                        ticketType,
                        firstname: firstname.trim(),
                        lastname: lastname.trim(),
                        address: address.trim(),
                        buyerEmail: email
                    });

                    return res.status(201).json(ticket);
                } catch (error) {
                    await this.TicketType.updateOne(
                        { _id: ticketType },
                        { $inc: { quantity: 1 } }
                    );

                    if (error.code === 11000) {
                        return res.status(409).json({
                            message: 'Buyer already has a ticket for this event'
                        });
                    }

                    throw error;
                }
            } catch (error) {
                fail(res, error);
            }
        });
    }
}
