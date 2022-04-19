const createServer = async () => {
    const { default: express } = await import('express');
    const { default: axios } = await import('axios');
    const { load } = await import('cheerio');
    const { default: cors } = await import('cors');
    const { upload } = await import('node-annonfiles');
    const { default: stream } = await import('stream');
    const { default: fs } = await import('fs');
    const { default: formidable } = await import('formidable');
    const app = express();
    app.use(express.json());
    app.use(express.raw({ limit: '1gb' }));
    app.use(cors());
    app.get('/downloadFile/:url', async (req, res) => {
        const anonFilesUrl = req.params.url;
        const anonFileMarkup = (await axios.get(anonFilesUrl)).data;
        const $ = load(anonFileMarkup);
        const anonLink = $('#download-url').attr('href');
        if (!anonLink) {
            res.end(500);
            return;
        }
        console.log(anonLink);
        const buffer = (await axios.get(anonLink)).data;
        const readStream = new stream.PassThrough();
        readStream.end(buffer);
        readStream.pipe(res);
    });
    app.route('/postFile').post((req, res, _next) => {
        var form = new formidable.IncomingForm();
        form.parse(req, (_err, _fields, files) => {
            (async (_err, _fields, files) => {
                const file = files.file;
                console.log(file.filepath);
                const uploadFile = await upload({
                    file: file.filepath,
                    key: null
                });
                console.log(uploadFile);
                if (uploadFile.status) {
                    res.end(JSON.stringify(uploadFile.data.file));
                    fs.rm(file.filepath, (err) => {
                        if (!err) {
                            console.log(`${file.filepath} deleted`);
                        }
                        else {
                            console.error(`Could not delete ${file.filepath}`);
                        }
                    });
                }
                else {
                    res.end(500);
                }
            })(_err, _fields, files).catch(() => {
                res.end(500);
            });
        });
    });
    return app.listen(8080, () => {
        console.log('Listening on port 8080');
    });
};
let server = await createServer();
process.on('uncaughtException', () => {
    server.close();
    // app.listen(8080);
    createServer().then((s) => { server = s; }).catch(console.error);
});
process.on('unhandledRejection', () => {
    createServer().catch(console.error);
});
export {};
