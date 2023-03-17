let exported = {}
module.exports = exported

const request = require('request');
const mongoose = require('mongoose');
const MathpixOcrRequest = mongoose.model('MathpixOcrRequest')
const fs = require('fs')
const fsE = require('fs-extra')
const path = require('path')

const CONFIG = require('../config');

const RequestUtils = require('./RequestUtils');
const CommonUtils = require('./CommonUtils');
const { runMain } = require('module');

let PROCESSOR_RUNNING = false
let CONVERTER_RUNNING = false

async function convertMmdToDocx(mmdContent, outputFileName, outputFilePath) {
    let cType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    let resultConvert = await new Promise((resolve, reject) => {
        request.post({
            url: 'https://api.mathpix.com/v1/export/docx',
            headers: {
                'app_key': CONFIG.mathpix.auth.app_key
            },
            body: JSON.stringify({
                mmd: mmdContent,
                fileName: outputFileName
            }),
            encoding: 'binary',
        }, (err, response, body) => {
            // console.log(response.headers);
            // console.log(body);
            if (response.statusCode !== 200 || response.headers["content-type"] !== cType) {
                if (response.headers["content-type"] === "application/json") {
                    const jsonResponseBody = body
                    try {
                        jsonResponseBody = JSON.parse(jsonResponseBody)
                    } catch (e) { }
                    if (
                        jsonResponseBody["errors"] &&
                        jsonResponseBody["errors"].length &&
                        jsonResponseBody["errors"][0]["id"] === "invalid_app_key_header"
                    ) {
                        console.log(`Invalid app key set in "MATHPIX_OCR_API_KEY" environment variable.`);
                        return resolve({
                            status: 'error',
                            error: 'Something went wrong'
                        })
                    } else {
                        console.log(`Unexpected error, please submit a bug report at: nowhere 1`);
                        return resolve({
                            status: 'error',
                            error: 'Something went wrong'
                        })
                    }
                } else {
                    const textResponseBody = body
                    console.log(`Unexpected error, please submit a bug report at: nowhere 2`);
                    return resolve({
                        status: 'error',
                        error: 'Something went wrong'
                    })
                }
            }

            const bufferResponseBody = body
            try {
                fs.writeFileSync(outputFilePath, bufferResponseBody, 'binary');
                return resolve({
                    status: 'success',
                    outputFileName,
                    outputFilePath
                })
            } catch (err) {
                console.log(`Could not write to destination path: nowhere 3`);
                return resolve({
                    status: 'error',
                    error: 'Something went wrong'
                })
            }
        })
    })
    return resultConvert
}

async function processImage(imagePublicUrl) {
    let resultProcess = await RequestUtils.executeRequest({
        url: 'https://api.mathpix.com/v3/text',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'app_id': CONFIG.mathpix.auth.app_id,
            'app_key': CONFIG.mathpix.auth.app_key
        },
        json: {
            // 'src': fs.readFileSync(imageFilePath).toString('base64'),
            // 'src': fs.createReadStream(imageFilePath),
            'src': imagePublicUrl,
            "formats": ["text", "data", "html", "latex_normal", "mmd"],
            "data_options": {
                "include_asciimath": true,
                "include_latex": true
            }
        }
    }, 200)
    return resultProcess
}

async function initProcessor() {
    let pendingRequests = []
    try {
        pendingRequests = await MathpixOcrRequest.find({ status: 'new' }).exec()
    } catch (e) {

    }
    console.log(`${pendingRequests.length} requests to process`);
    for (let i = 0; i < pendingRequests.length; i++) {
        let request = pendingRequests[i]
        console.log('processing request', request._id, i + 1, '/', pendingRequests.length);
        request.mathpixRequestCreatedAt = new Date()
        let resultProcessImage = await processImage(`https://juan.dhtb.xyz/ocr/${request._id}/src`)
        if (resultProcessImage.status != 'success') {
            request.status = 'error'
            request.errorReason = resultProcessImage.error
            request.finishedAt = new Date()
            await request.save()
            continue
        }
        let body = resultProcessImage.body
        try {
            body = JSON.parse(body)
        } catch (e) {

        }
        request.mathpixRequestId = body.request_id
        let ocrRawFileName = request.id + '.json'
        let mmdFileName = request.id + '.mmd'

        let now = new Date()
        let theDate = CommonUtils.dateFormat(now)
        fs.mkdirSync(path.join(__dirname, '../ocr', theDate), { recursive: true })
        let ocrRawFilePath = path.join(__dirname, '../ocr', theDate, ocrRawFileName)
        let mmdFilePath = path.join(__dirname, '../ocr', theDate, mmdFileName)

        fs.writeFileSync(ocrRawFilePath, JSON.stringify(body, null, 2))
        fs.writeFileSync(mmdFilePath, body.text)

        request.status = 'solved'
        request.updateAt = now
        request.mathpixRequestUpdatedAt = now
        request.duration = now.getTime() - request.mathpixRequestCreatedAt.getTime()
        request.ocrRawFileName = ocrRawFileName
        request.mmdFileName = mmdFileName
        request.ocrRawFilePath = ocrRawFilePath
        request.mmdFilePath = mmdFilePath
        await request.save()
        
    }
    console.log(`Done processing ${pendingRequests.length} requests`);
}

async function initConverter() {
    let pendingRequests = []
    try {
        pendingRequests = await MathpixOcrRequest.find({ status: 'solved' }).exec()
    } catch (e) {

    }
    console.log(`${pendingRequests.length} requests to generate docx`);
    for (let i = 0; i < pendingRequests.length && i < 1; i++) {
        let request = pendingRequests[i]
        console.log('generating docx for request', request._id, i + 1, '/', pendingRequests.length);

        
        let docxFileName = request.id + '.docx'

        let now = new Date()
        let theDate = CommonUtils.dateFormat(now)
        fs.mkdirSync(path.join(__dirname, '../ocr', theDate), { recursive: true })
        let docxFilePath = path.join(__dirname, '../ocr', theDate, docxFileName)

        let content = fs.readFileSync(request.mmdFilePath).toString('utf8')
        let resultConvert = await convertMmdToDocx(content, docxFileName, docxFilePath)
        if (resultConvert.status != 'success') {
            request.status = 'failed-to-convert-docx'
            request.updateAt = new Date()
            request.finishedAt = request.updateAt
            await request.save()
            continue
        }

        request.status = 'processed'
        request.updateAt = now
        request.docxFileName = docxFileName
        request.docxFilePath = docxFilePath
        await request.save()
        
    }
    console.log(`Done generating docx ${pendingRequests.length} requests`);
}

async function test() {
    let r = await processImage('https://juan.dhtb.xyz/ocr/61e31bbd74df3bee789f2444/src')
    console.log(r.status);
    console.log(r.body);
    
}

async function run() {
    while (true) {
        try {
            await initProcessor()
        } catch (e) {}
        try {
            await initConverter()
        } catch (e) {}

        await new Promise((resolve, reject) => {
            setTimeout(() => {
                return resolve(true)
            }, 60 * 1000);
        })
    }
}

if (CONFIG.mathpix.autoInitProcessor) {
    run()
}

// test()

exported.convertMmdToDocx = convertMmdToDocx