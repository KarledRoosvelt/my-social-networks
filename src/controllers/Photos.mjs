import PhotoSchema from '../models/photo.mjs';
import AlbumSchema from '../models/album.mjs';

const Photos = class Photos {
    constructor(app, connection) {
        this.app = app;
        this.connection = connection;

        this.PhotoModel =
            this.connection.models.Photo ||
            this.connection.model('Photo', PhotoSchema);

        this.AlbumModel =
            this.connection.models.Album ||
            this.connection.model('Album', AlbumSchema);

        this.run();
    }

    getPhotosByAlbum() {
        this.app.get('/album/:idalbum/photos', async (req, res) => {
            try {
                const album = await this.AlbumModel.findById(req.params.idalbum);

                if (!album) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Album not found'
                    });
                }

                const photos = await this.PhotoModel.find({
                    album: req.params.idalbum
                });

                res.status(200).json(photos);

            } catch (error) {
                res.status(500).json({
                    code: 500,
                    message: error.message
                });
            }
        });
    }

    getPhotoByID() {
        this.app.get('/album/:idalbum/photo/:idphoto', async (req, res) => {
            try {
                const photo = await this.PhotoModel.findOne({
                    _id: req.params.idphoto,
                    album: req.params.idalbum
                });

                if (!photo) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Photo not found'
                    });
                }

                res.status(200).json(photo);

            } catch (error) {
                res.status(500).json({
                    code: 500,
                    message: error.message
                });
            }
        });
    }

    createPhoto() {
        this.app.post('/album/:idalbum/photo', async (req, res) => {
            try {
                const album = await this.AlbumModel.findById(req.params.idalbum);

                if (!album) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Album not found'
                    });
                }

                const photo = await this.PhotoModel.create({
                    ...req.body,
                    album: album._id
                });

                album.photos.push(photo._id);
                await album.save();

                res.status(201).json(photo);

            } catch (error) {
                res.status(400).json({
                    code: 400,
                    message: error.message
                });
            }
        });
    }

    updatePhotoByID() {
        this.app.put('/album/:idalbum/photo/:idphoto', async (req, res) => {
            try {
                const photo = await this.PhotoModel.findOneAndUpdate(
                    {
                        _id: req.params.idphoto,
                        album: req.params.idalbum
                    },
                    req.body,
                    {
                        new: true,
                        runValidators: true
                    }
                );

                if (!photo) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Photo not found'
                    });
                }

                res.status(200).json(photo);

            } catch (error) {
                res.status(400).json({
                    code: 400,
                    message: error.message
                });
            }
        });
    }

    deletePhotoByID() {
        this.app.delete('/album/:idalbum/photo/:idphoto', async (req, res) => {
            try {
                const photo = await this.PhotoModel.findOneAndDelete({
                    _id: req.params.idphoto,
                    album: req.params.idalbum
                });

                if (!photo) {
                    return res.status(404).json({
                        code: 404,
                        message: 'Photo not found'
                    });
                }

                await this.AlbumModel.findByIdAndUpdate(
                    req.params.idalbum,
                    {
                        $pull: {
                            photos: photo._id
                        }
                    }
                );

                res.status(200).json({
                    message: 'Photo deleted'
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
        this.getPhotosByAlbum();
        this.getPhotoByID();
        this.createPhoto();
        this.updatePhotoByID();
        this.deletePhotoByID();
    }
};

export default Photos;