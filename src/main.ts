import * as express from 'express';
import * as ytdl from 'ytdl-core';

const app = express();

const getVideoLength = async (videoUrl: string) => {
  const videoInfo = await ytdl.getInfo(videoUrl);
  const videoFormat = ytdl.chooseFormat(videoInfo.formats, {
    quality: 'highest',
    filter: 'videoandaudio',
  });

  const response = await fetch(videoFormat.url, {
    method: 'HEAD',
  });

  console.log('Video length', response.headers.get('content-length'));
  const videoByteLength = response.headers.get('content-length') || '0';
  return parseInt(videoByteLength, 10);
};

app.get('/redirect', async (req, res) => {
  const range = req.headers.range;
  const queryParams = req.query;

  if (!range) {
    return res.status(400).send('Requires Range header');
  }
  if (!queryParams || !queryParams?.url) {
    return res.status(400).send('Requires url in query params');
  }

  const videoUrl = queryParams.url as string;
  const fullLength = await getVideoLength(videoUrl);
  if (!fullLength) {
    res.status(400).send('Unable to get video length');
  }
  const chunkSize = 10 ** 6;

  const start = Number(range.replace(/\D/g, ''));
  const end = Math.min(start + chunkSize, fullLength - 1);
  const contentLength = end - start + 1;

  if (!res.headersSent) {
    res.status(206).header({
      'Content-Range': `bytes ${start}-${end}/${fullLength}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': 'video/mp4',
    });
  }

  console.log('Starting stream');
  const videoStream = ytdl(videoUrl, {
    quality: 'highest',
    filter: 'videoandaudio',
    range: {
      start,
      end,
    },
  });

  console.log('Sending stream');
  return videoStream.pipe(res);
});

app.listen(3000, () => {
  console.log('Server started at url http://localhost:3000');
});
