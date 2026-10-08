import AlbumSchema from '../models/album.mjs';

const Albums = class Albums {
    constructor(app, connection) {
        this.app = app;
        this.connection = connection;
        this.Model = this.connection.model('Album', AlbumSchema);
        this.run();
    }

    getAlbums() {
        this.app.get('/albums', async (req, res) => {
            try {
                const filter = {};

                if (req.query.name) {
                    filter.title = {
                        $regex: req.query.name,
                        $options: 'i'
                    };
                }

                const albums = await this.Model
                    .find(filter)
                    .populate('photos');

                res.status(200).json(albums);

            } catch (error) {
                res.status(500).json({
                    code: 500,
                    message: error.message
                });
            }
        });
    }

    getAlbumByID() {
        this.app.get('/album/:id', async (req, res) => {
            try {
                const album = await this.Model
                    .findById(req.params.id)
                    .populate('photos');

                if (!album) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Album not found'
                    });
                }

                res.status(200).json(album);

            } catch (error) {
                res.status(500).json({
                    code: 500,
                    message: error.message
                });
            }
        });
    }

    createAlbum() {
        this.app.post('/album', async (req, res) => {
            try {
                const album = await this.Model.create(req.body);

                res.status(201).json(album);

            } catch (error) {
                res.status(400).json({
                    code: 400,
                    message: error.message
                });
            }
        });
    }

    updateAlbumByID() {
        this.app.put('/album/:id', async (req, res) => {
            try {
                const album = await this.Model.findByIdAndUpdate(
                    req.params.id,
                    req.body,
                    {
                        new: true,
                        runValidators: true
                    }
                );

                if (!album) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Album not found'
                    });
                }

                res.status(200).json(album);

            } catch (error) {
                res.status(400).json({
                    code: 400,
                    message: error.message
                });
            }
        });
    }

    deleteAlbumByID() {
        this.app.delete('/album/:id', async (req, res) => {
            try {
                const album = await this.Model.findByIdAndDelete(
                    req.params.id
                );

                if (!album) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Album not found'
                    });
                }

                res.status(200).json({
                    message: 'Album deleted'
                });

            } catch (error) {
                res.status(500).json({
                    code: 500,
                    message: error.message
                });
            }
        });
    }

    run() {
        this.getAlbums();
        this.getAlbumByID();
        this.createAlbum();
        this.updateAlbumByID();
        this.deleteAlbumByID();
    }
};

export default Albums;