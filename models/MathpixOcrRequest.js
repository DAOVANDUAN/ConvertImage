const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mathpixOcrRequestSchema = new Schema({
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  finishedAt: Date,
  status: {type: String, default: 'new'},
  errorReason: String,
  duration: Number,

  fileName: String,
  filePath: String,
  originalFileName: String,

  mmdFileName: String,
  mmdFilePath: String,
  docxFileName: String,
  docxFilePath: String,
  pdfFileName: String,
  pdfFilePath: String,

  mathpixRequestCreatedAt: Date,
  mathpixRequestUpdatedAt: Date,
  mathpixRequestId: String,
  ocrRawFileName: String,
  ocrRawFilePath: String,
  
});

const MathpixOcrRequest = mongoose.model('MathpixOcrRequest', mathpixOcrRequestSchema);

module.exports = MathpixOcrRequest;