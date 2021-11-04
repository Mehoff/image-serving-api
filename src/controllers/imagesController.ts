import * as formidable from 'formidable';
import { sendHttpJsonResponse } from '../utils/sendHttpJsonResponse';
import { IncomingMessage, ServerResponse } from 'http';
import { Types } from 'mongoose';
import { moveFile } from '../utils/moveFile';
import { ImageModel } from '../models/imageModel';
import { serveFile } from '../utils/serveFile';

export default class ImagesController {
  public static imageUrlPattern = /^\/uploads\/([0-9A-z]{24})\.(jpg|jpeg|png|webp)$/;

  public async uploadImage(req: IncomingMessage, res: ServerResponse) {
    try {
      const form = new formidable.IncomingForm();

      form.parse(req, async function (err, fields, files) {
        if (err) {
          throw err;
        }

        const file: any = (files.upload as any)?.length
          ? files.image[0]
          : files.image;

        if (!file) {
          return sendHttpJsonResponse(res, 403, { message: 'File not passed' });
        }

        if (
          ['image/jpg', 'image/jpeg', 'image/webp', 'image/png'].indexOf(
            file.mimetype
          ) === -1
        ) {
          return sendHttpJsonResponse(res, 403, {
            message: 'File mime type not supported',
          });
        }

        const fileExtension = file.originalFilename.slice(
          file.originalFilename.lastIndexOf('.') + 1,
          file.originalFilename.length
        );

        if (['jpg', 'jpeg', 'webp', 'png'].indexOf(fileExtension) === -1) {
          return sendHttpJsonResponse(res, 403, {
            message: 'File extension not supported',
          });
        }

        const imageId = new Types.ObjectId();
        const imageName = imageId + '.' + fileExtension;
        const oldPath = file._writeStream.path;
        const newPath = './src/www/public/uploads/original/' + imageName;

        moveFile(oldPath, newPath);

        await ImageModel.create({ _id: imageId });

        await sendHttpJsonResponse(res, 200, {
          message: 'Image uploaded',
          imageId,
          link: `${process.env.API_URL}/uploads/${imageName}`,
        });
      });
    } catch (error: any) {
      sendHttpJsonResponse(res, 500, {
        message: error.message || 'Failed to upload image',
      });
    }
  }

  public async serveImage(req: IncomingMessage, res: ServerResponse) {
    try {
      const decomposedUrl = req.url.match(ImagesController.imageUrlPattern);
      const imageId = decomposedUrl[1];
      const imageExtension = decomposedUrl[2];

      console.log({ imageId, imageExtension });

      return await serveFile(
        './src/www/public/uploads/original/' + imageId + '.' + imageExtension,
        res
      );
    } catch (error) {
      return sendHttpJsonResponse(res, 404, {
        message: 'Failed to serve image',
      });
    }
  }
}
