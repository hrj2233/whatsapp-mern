// importing
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Messages from './dbMessages.js';
import Pusher from 'pusher';
import cors from 'cors';

// app config
const app = express();
dotenv.config();
const port = process.env.PORT || 9000;
const url = process.env.DB_URL;

const pusher = new Pusher({
  appId: '1287880',
  key: '48da668d44abf919ef43',
  secret: 'fb4abc22e30e9072dbf0',
  cluster: 'ap3',
  useTLS: true,
});

// middleware
app.use(express.json());
app.use(cors());

// db config
mongoose.connect(url);
const db = mongoose.connection;
db.once('open', () => {
  console.log('DB connected');

  const msgCollection = db.collection('messagecontents');
  const changeStream = msgCollection.watch();
  changeStream.on('change', (change) => {
    console.log('A change occured', change);

    if (change.operationType === 'insert') {
      const messageDetails = change.fullDocument;
      pusher.trigger('messages', 'inserted', {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log('Error triggering Pusher');
    }
  });
});

// api routes
app.get('/', (req, res) => res.status(200).send('hello world'));

app.get('/messages/sync', (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post('/messages/new', (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

// listening
app.listen(port, () => console.log(`listening on http:localhost:${port}`));
