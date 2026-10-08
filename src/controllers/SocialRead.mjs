import mongoose from 'mongoose';
import auth from '../middlewares/auth.mjs';

export default class SocialRead {
    constructor(app, connection) {
        this.Group = connection.model('Group');
        this.Event = connection.model('Event');
        this.Discussion = connection.model('Discussion');
        this.Album = connection.model('SocialAlbum');
        this.Poll = connection.model('Poll');

        this.registerRoutes(app);
    }

    registerRoutes(app) {
        const valid = id => mongoose.isValidObjectId(id);

        const includes = (ids, userId) =>
            ids.some(id => String(id) === String(userId));

        const canRead = async (kind, id, userId) => {
            if (!id || !valid(id)) return false;

            if (kind === 'group') {
                const group = await this.Group.findById(id);
                return !!group && includes(
                    [...group.members, ...group.administrators],
                    userId
                );
            }

            const event = await this.Event.findById(id);
            return !!event && includes(
                [...event.participants, ...event.organizers],
                userId
            );
        };

        const allowed = async (document, userId) => {
            if (document.group) {
                return canRead('group', document.group, userId);
            }
            if (document.event) {
                return canRead('event', document.event, userId);
            }
            return false;
        };

        const handleError = (res, error) => {
            console.error(error);
            return res.status(500).json({
                message: 'Internal server error'
            });
        };

        const registerList = (path, Model, transform) => {
            app.get(path, auth, async (req, res) => {
                try {
                    const documents = await Model.find().lean();
                    const results = [];

                    for (const document of documents) {
                        if (await allowed(document, req.user.userId)) {
                            results.push(transform
                                ? transform(document, req.user.userId)
                                : document
                            );
                        }
                    }

                    return res.json(results);
                } catch (error) {
                    return handleError(res, error);
                }
            });
        };

        const registerDetail = (path, Model, transform) => {
            app.get(path, auth, async (req, res) => {
                try {
                    if (!valid(req.params.id)) {
                        return res.status(400).json({
                            message: 'Invalid ID'
                        });
                    }

                    const document = await Model.findById(
                        req.params.id
                    ).lean();

                    if (!document) {
                        return res.status(404).json({
                            message: 'Resource not found'
                        });
                    }

                    if (!await allowed(document, req.user.userId)) {
                        return res.status(403).json({
                            message: 'Access denied'
                        });
                    }

                    return res.json(transform
                        ? transform(document, req.user.userId)
                        : document
                    );
                } catch (error) {
                    return handleError(res, error);
                }
            });
        };

        const safePoll = (poll, userId) => ({
            ...poll,
            questions: poll.questions.map(question => ({
                ...question,
                answers: undefined,
                voteCount: question.answers.length,
                myAnswer: question.answers.find(
                    answer => String(answer.user) === String(userId)
                )?.optionIndex ?? null
            }))
        });

        registerList('/discussions', this.Discussion);
        registerDetail('/discussions/:id', this.Discussion);

        registerList('/social-albums', this.Album);
        registerDetail('/social-albums/:id', this.Album);

        registerList('/polls', this.Poll, safePoll);
        registerDetail('/polls/:id', this.Poll, safePoll);
    }
}
