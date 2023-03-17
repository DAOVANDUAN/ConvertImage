var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const MathpixOcrRequest = mongoose.model('MathpixOcrRequest')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.status(200).json({
    status: 'success'
  })
});

router.get('/ocr/:id/src', async (req, res, next) => {
  let request = null
  try {
    request = await MathpixOcrRequest.findById(req.params.id).exec()
  } catch (e) {

  }
  if (!request) {
    return res.status(404).json({
      status: 'error',
      error: '404 Not Found'
    })
  }
  return res.sendFile(request.filePath)
})

module.exports = router;
