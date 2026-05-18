const multer = require('multer');
const path = require('path');

const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880; // 5 MB

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only JPEG, JPG, and PNG images are allowed.'));
};

const documentFilter = (req, file, cb) => {
  const allowed = /pdf|jpeg|jpg|png/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = /pdf|jpeg|jpg|png/.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only PDF, JPEG, JPG, and PNG files are allowed.'));
};

const storage = multer.memoryStorage();

const uploadImages = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter: imageFilter,
});

const uploadDocuments = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter: documentFilter,
});

module.exports = { uploadImages, uploadDocuments };
