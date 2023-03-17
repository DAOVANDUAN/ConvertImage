var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const MathpixOcrRequest = mongoose.model('MathpixOcrRequest')
const fs = require('fs')
const fsE = require('fs-extra')
const path = require('path')
const katex = require('katex')
const multer = require('multer');
var upload = multer({ dest: path.join(__dirname, '../uploads/raw') })

const CONFIG = require('../config');
const CommonUtils = require('../utils/CommonUtils');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('ocr')
});

router.get('/requests', async (req, res, next) => {
  let requests = []
  try {
    requests = await MathpixOcrRequest.find({}, null, {sort: {createdAt: -1}}).exec()
  } catch (e) {
    
  }
  if (req.query.datatype == 'datatable') {
    let viewStatus = {
      'new': '<span>Mới</span>',
      'processed': '<span class="text-success">Đã xử lý</span>',
    }
    let resultDatatable = []
    for(let request of requests) {
      resultDatatable.push([
        request._id,
        CommonUtils.dateTimeFormat(request.createdAt),
        viewStatus[request.status],
        `<img class='img img-response' style='max-width: 500px' src='/ocr-${CONFIG.app.secretPath}/${request._id}/src'>`,
        `<iframe src='/ocr-${CONFIG.app.secretPath}/${request._id}/html' width="600px" height="600px" style="border:1px solid black;"></iframe>`,
        (request.docxFilePath && fs.existsSync(request.docxFilePath)) ?
        (`<a href='/ocr-${CONFIG.app.secretPath}/${request._id}/html' target='_blank' class='btn btn-primary'>Preview</a><br/><br/>` +
        `<a href='/ocr-${CONFIG.app.secretPath}/${request._id}/docx' target='_blank' class='btn btn-success'>Tải file docx</a>`
        ) : ''
      ])
    }
    return res.status(200).json({
      status: 'success',
      requests: requests,
      data: resultDatatable,
      recordsFiltered: resultDatatable.length,
      recordsTotal: resultDatatable.length
    })
  }
  return res.status(200).json({
    status: 'success',
    requests
  })
})

router.get('/:id/src', async (req, res, next) => {
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

router.get('/:id/html', async (req, res, next) => {
  let request = null
  try {
    request = await MathpixOcrRequest.findById(req.params.id).exec()
  } catch (e) {

  }
  if (!request || !request.mmdFilePath || !fs.existsSync(request.mmdFilePath)) {
    return res.status(404).json({
      status: 'error',
      error: '404 Not Found'
    })
  }

  let s = fs.readFileSync(request.mmdFilePath).toString('utf8')
  s = s.replace(/\\\[/g, '')
  s = s.replace(/\\\]/g, '')
  s = s.replace(/\\\(/g, '')
  s = s.replace(/\\\)/g, '')
  s = s.replace(/\n/g, '\\newline ')
  s = s.replace(/\s/g, '\\space ')

  let html = katex.renderToString(s, 
      {
          throwOnError: false,
          displayMode: true,
          fleqn: true,
          strict: 'ignore'
      }
  )

  let source = 
  `<!DOCTYPE html>
  <!-- KaTeX requires the use of the HTML5 doctype. Without it, KaTeX may not render properly -->
  <html>
    <head>
      <link rel="stylesheet" href="/katex/katex.min.css" integrity="sha384-MlJdn/WNKDGXveldHDdyRP1R4CTHr3FeuDNfhsLPYrq2t0UBkUdK2jyTnXPEK1NQ" crossorigin="anonymous">

      <!-- The loading of KaTeX is deferred to speed up page rendering -->
      <script defer src="/katex/katex.min.js" integrity="sha384-VQ8d8WVFw0yHhCk5E8I86oOhv48xLpnDZx5T9GogA/Y84DcCKWXDmSDfn13bzFZY" crossorigin="anonymous"></script>

      <!-- To automatically render math in text elements, include the auto-render extension: -->
      <script defer src="/javascripts/katex/auto-render.min.js" integrity="sha384-+XBljXPPiv+OzfbB3cVmLHf4hdUFHlWNZN5spNQ7rmHTXpd7WvJum6fIACpNNfIR" crossorigin="anonymous"
          onload="renderMathInElement(document.body);"></script>
    </head>
    ${html}
  </html>
  `

  return res.status(200).header('Content-Type', 'text/html').send(source)
  
})

router.get('/:id/docx', async (req, res, next) => {
  let request = null
  try {
    request = await MathpixOcrRequest.findById(req.params.id).exec()
  } catch (e) {

  }
  if (!request || !request.docxFilePath || !fs.existsSync(request.docxFilePath)) {
    return res.status(404).json({
      status: 'error',
      error: '404 Not Found'
    })
  }
  return res.download(request.docxFilePath, request.originalFileName + '.docx')
})

router.post('/request', upload.single('img'), async (req, res, next) => {
  console.log(req.body);
  console.log(req.file);
  
  // {
  //   fieldname: 'img',
  //   originalname: 'photo_2022-01-15_23-22-05.jpg',
  //   encoding: '7bit',
  //   mimetype: 'image/jpeg',
  //   destination: '/home/donnn/workspace/juan/uploads/raw',
  //   filename: 'f43f794c6242a4edf8fbde84331a7346',
  //   path: '/home/donnn/workspace/juan/uploads/raw/f43f794c6242a4edf8fbde84331a7346',
  //   size: 114353
  // }

  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      error: 'Thiếu file'
    })
  }

  let request = new MathpixOcrRequest()
  // console.log('_id', request._id);
  let now = new Date()
  let fileName = request._id + (('image/png'.localeCompare(req.file.mimetype) == 0) ? '.png' : '.jpg')
  let theDate = CommonUtils.dateFormat(now)
  fs.mkdirSync(path.join(__dirname, '../uploads/storage', theDate), { recursive: true })
  let filePath = path.join(__dirname, '../uploads/storage', theDate, fileName)
  fsE.moveSync(req.file.path, filePath)

  request.fileName = fileName
  request.filePath = filePath
  request.originalFileName = req.file.originalname
  await request.save()

  return res.status(200).json({
    status: 'success'
  })

})

module.exports = router;
