import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService {
  private app;
  public db;
  public rdb;
  public ref;
  private vertexAI;

  constructor(private eventEmitter: EventEmitter2) {
    const serviceAccountPath = path.resolve(
      __dirname,
      '../../../kwikmarket-admin.json',
    );
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      credential: admin.credential.cert(serviceAccountPath),
    };

    console.log('Initializing Firebase service');
    this.app = admin.initializeApp(firebaseConfig);

    this.db = admin.firestore();
    this.rdb = admin.database();
    this.ref = this.rdb.ref('/chat');
    // this.vertexAI = getVertexAI();

    this.startListening();
  }

  emitChatEvent(snapshot) {
    const newData = snapshot.val();
    const key = snapshot.key;
    const lastChildNum = snapshot.numChildren() - 1;
    console.log('New child added:', newData, lastChildNum);

    if (typeof newData !== 'object') return;

    const child_added = newData[Object.keys(newData)[0]];

    const lastChild = JSON.parse(
      child_added[
        Object.keys(child_added)[Object.keys(child_added).length - 1]
      ],
    );

    console.log('Last child:', lastChild, typeof lastChild, lastChild.role);
    console.log(key);

    if (lastChild.role === 'model') {
      this.eventEmitter.emit('chat.send', {
        key: `${key}/${Object.keys(newData)[0]}`,
        data: lastChild,
      });
      return;
    }

    this.eventEmitter.emit('chat.received', {
      key: `${key}/${Object.keys(newData)[0]}`,
      data: child_added,
    });
  }

  startListening() {
    // Add the listener
    this.ref.on('child_changed', (snapshot) => {
      console.log('Child changed:');
      return this.emitChatEvent(snapshot);
    });

    // this.ref.on('child_added', (snapshot) => {
    //   return this.emitChatEvent(snapshot);
    // });
  }

  async writeData(path: string, data: any): Promise<void> {
    await this.db.ref(path).set(data);
  }

  async queueChatMessage(message: string, threadID: string) {
    console.log('Queueing chat message:', message);

    // add message to Firestore
    this.rdb.ref(`chat/${threadID}`).set(message);
  }
}
