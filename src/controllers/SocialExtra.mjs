
import mongoose from 'mongoose';
import auth from '../middlewares/auth.mjs';

export default class SocialExtra {
    constructor(app, connection) {
        this.app = app;
        this.Group = connection.model('Group');
        this.Event = connection.model('Event');
        this.Discussion = connection.model('Discussion');
        this.Album = connection.model('SocialAlbum');
        this.Ticket = connection.model('Ticket');
        this.TicketType = connection.model('TicketType');

        this.registerRoutes();
    }

    registerRoutes() {
        const app = this.app;

        const isValid = id => mongoose.isValidObjectId(id);

        const containsUser = (ids, userId) =>
            ids.some(id => String(id) === String(userId));

        const errorResponse = (res, error) => {
            console.error(error);
            return res.status(500).json({
                message: 'Internal server error'
            });
        };

        // REPONDRE A UN MESSAGE
        app.post(
            '/discussions/:id/messages/:messageId/replies',
            auth,
            async (req, res) => {
                try {
                    const { id, messageId } = req.params;

                    if (!isValid(id) || !isValid(messageId)) {
                        return res.status(400).json({
                            message: 'Invalid ID'
                        });
                    }

                    if (
                        typeof req.body.content !== 'string' ||
                        !req.body.content.trim()
                    ) {
                        return res.status(400).json({
                            message: 'Reply content required'
                        });
                    }

                    const discussion =
                        await this.Discussion.findById(id);

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

                    if (!containsUser(members, req.user.userId)) {
                        return res.status(403).json({
                            message: 'Membership required'
                        });
                    }

                    if (discussion.group && !target.allowMemberPosts &&
                        !containsUser(target.administrators, req.user.userId)) {
                        return res.status(403).json({
                            message: 'Only administrators can reply'
                        });
                    }

                    const message = discussion.messages.id(messageId);

                    if (!message) {
                        return res.status(404).json({
                            message: 'Message not found'
                        });
                    }

                    message.replies.push({
                        author: req.user.userId,
                        content: req.body.content.trim()
                    });

                    await discussion.save();

                    res.status(201).json({
                        message: 'Reply added',
                        replies: message.replies
                    });
                } catch (error) {
                    errorResponse(res, error);
                }
            }
        );

        // COMMENTER UNE PHOTO
        app.post(
            '/social-albums/:id/photos/:photoId/comments',
            auth,
            async (req, res) => {
                try {
                    const { id, photoId } = req.params;

                    if (!isValid(id) || !isValid(photoId)) {
                        return res.status(400).json({
                            message: 'Invalid ID'
                        });
                    }

                    if (
                        typeof req.body.content !== 'string' ||
                        !req.body.content.trim()
                    ) {
                        return res.status(400).json({
                            message: 'Comment content required'
                        });
                    }

                    const album = await this.Album.findById(id);

                    if (!album) {
                        return res.status(404).json({
                            message: 'Album not found'
                        });
                    }

                    const event = await this.Event.findById(album.event);

                    if (!event || !containsUser(
                        [...event.participants, ...event.organizers],
                        req.user.userId
                    )) {
                        return res.status(403).json({
                            message: 'Event participation required'
                        });
                    }

                    const photo = album.photos.id(photoId);

                    if (!photo) {
                        return res.status(404).json({
                            message: 'Photo not found'
                        });
                    }

                    photo.comments.push({
                        author: req.user.userId,
                        content: req.body.content.trim()
                    });

                    await album.save();

                    res.status(201).json({
                        message: 'Comment added',
                        comments: photo.comments
                    });
                } catch (error) {
                    errorResponse(res, error);
                }
            }
        );

        // INVITER UN UTILISATEUR DANS UN GROUPE
        app.post('/groups/:id/invite', auth, async (req, res) => {
            try {
                const { id } = req.params;
                const { userId } = req.body;

                if (!isValid(id) || !isValid(userId)) {
                    return res.status(400).json({
                        message: 'Invalid ID'
                    });
                }

                const group = await this.Group.findById(id);

                if (!group) {
                    return res.status(404).json({
                        message: 'Group not found'
                    });
                }

                if (!containsUser(
                    group.administrators,
                    req.user.userId
                )) {
                    return res.status(403).json({
                        message: 'Only administrators can invite'
                    });
                }

                const user = await mongoose.modelNames();
                // Vérification de l'utilisateur sur la connexion
                const User = group.constructor.db.model('User');
                const invitedUser = await User.findById(userId);

                if (!invitedUser) {
                    return res.status(404).json({
                        message: 'User not found'
                    });
                }

                await this.Group.updateOne(
                    { _id: group._id },
                    { $addToSet: { members: userId } }
                );

                res.json({
                    message: 'User added to group'
                });
            } catch (error) {
                errorResponse(res, error);
            }
        });

        // INVITER UN UTILISATEUR A UN EVENEMENT
        app.post('/events/:id/invite', auth, async (req, res) => {
            try {
                const { id } = req.params;
                const { userId } = req.body;

                if (!isValid(id) || !isValid(userId)) {
                    return res.status(400).json({
                        message: 'Invalid ID'
                    });
                }

                const event = await this.Event.findById(id);

                if (!event) {
                    return res.status(404).json({
                        message: 'Event not found'
                    });
                }

                if (!containsUser(
                    event.organizers,
                    req.user.userId
                )) {
                    return res.status(403).json({
                        message: 'Only organizers can invite'
                    });
                }

                const User = event.constructor.db.model('User');
                const invitedUser = await User.findById(userId);

                if (!invitedUser) {
                    return res.status(404).json({
                        message: 'User not found'
                    });
                }

                await this.Event.updateOne(
                    { _id: event._id },
                    { $addToSet: { participants: userId } }
                );

                res.json({
                    message: 'User added to event'
                });
            } catch (error) {
                errorResponse(res, error);
            }
        });

        // CONSULTER LES BILLETS D'UN TYPE
        app.get('/ticket-types/:id/tickets', auth, async (req, res) => {
            try {
                if (!isValid(req.params.id)) {
                    return res.status(400).json({
                        message: 'Invalid ticket type ID'
                    });
                }

                const type = await this.TicketType.findById(req.params.id);

                if (!type) {
                    return res.status(404).json({
                        message: 'Ticket type not found'
                    });
                }

                const event = await this.Event.findById(type.event);

                if (!event || !containsUser(
                    event.organizers,
                    req.user.userId
                )) {
                    return res.status(403).json({
                        message: 'Only organizers can view buyers'
                    });
                }

                const tickets = await this.Ticket.find({
                    ticketType: type._id
                });

                res.json(tickets);
            } catch (error) {
                errorResponse(res, error);
            }
        });
    }
}
