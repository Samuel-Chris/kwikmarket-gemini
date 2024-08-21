import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FirebaseService } from 'src/firebase/firebase.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HttpService } from '@nestjs/axios';
import { catchError } from 'rxjs';
import { VertexAI } from '@google-cloud/vertexai';
import { readFileSync } from 'fs';

type messageData = {
  user_id?: string;
  platform: string;
};

@Injectable()
export class ChatService {
  private model: any;
  private generativeModel: any;
  private fileContent: string;
  private menu: string;

  constructor(
    private firebaseService: FirebaseService,
    private httpService: HttpService,
  ) {
    this.fileContent = readFileSync('src/chat/prompts/main.txt', 'utf8');
    this.menu = readFileSync('src/chat/prompts/menu.csv', 'utf8');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      systemInstruction: this.fileContent
        .replace('[[ menu ]]', this.menu)
        .replace('[[ time ]]', `${new Date()}`),
    });

    const vertexAI = new VertexAI({
      project: 'kwikmarket-bfad2',
      location: 'us-central1',
    });

    this.generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
      // systemInstruction: this.fileContent
      //   .replace('[[ menu ]]', this.menu)
      //   .replace('[[ time ]]', `${new Date()}`),
    });
  }

  async sendReply({ to, business_phone_number_id, reply }) {
    try {
      const headers = {
        Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
      };

      console.log(to, business_phone_number_id);

      let body = {};

      console.log('Reply:', reply);

      if (reply.replyType === 'interactive') {
        body = {
          messaging_product: 'whatsapp',
          to,
          interactive: {
            type: 'list',
            elements: [
              {
                title: 'Order Summary',
                subtitle: 'Order Summary',
                image_url: 'https://example.com/image.jpg',
                default_action: {
                  type: 'web_url',
                  url: 'https://example.com',
                },
                buttons: [
                  {
                    type: 'web_url',
                    title: 'View Order',
                    url: 'https://example.com',
                  },
                ],
              },
              {
                title: 'Delivery Details',
                subtitle: 'Delivery Details',
                image_url: 'https://example.com/image.jpg',
                default_action: {
                  type: 'web_url',
                  url: 'https://example.com',
                },
                buttons: [
                  {
                    type: 'web_url',
                    title: 'View Details',
                    url: 'https://example.com',
                  },
                ],
              },
            ],
          },
        };
      } else {
        const content = reply;

        console.log('Reply:', content);
        body = {
          messaging_product: 'whatsapp',
          to,
          text: { body: content },
          // context: {
          //   message_id: message.id, // shows the message as a reply to the original user message
          // },
        };
      }

      this.httpService
        .post(
          `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
          body,
          { headers },
        )
        .pipe(
          catchError((error) => {
            console.log(error);
            console.log('Error sending reply 1');
            throw error;
          }),
        )
        .subscribe((response) => {
          console.log('Message sent successfully!');
          console.log(response.data);
        });
    } catch (error) {
      console.error(error);
    }
  }

  async sendReplyInstagram({ to, reply }) {
    try {
      const headers = {
        Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
      };

      console.log('Reply:', reply.length, to);

      const body = {
        recipient: {
          id: to,
        },
        message: {
          text: reply,
        },
      };

      this.httpService
        .post(
          'https://graph.instagram.com/v20.0/17841468389908290/messages',
          body,
          {
            headers,
          },
        )
        .pipe(
          catchError((error) => {
            console.log(JSON.stringify(error));
            console.log('Error sending reply 2');
            throw error;
          }),
        )
        .subscribe((response) => {
          console.log('Message sent successfully!');
          console.log(response.data);
        });
    } catch (error) {
      console.error(error);
    }
  }

  async trimResponse(response) {
    const orderData = response.match(
      /\[\[ data \]\]\n([\s\S]*?)\n\[\[ end_data \]\]/,
    );

    const deliveryData = response.match(
      /\[\[ delivery_data \]\]\n([\s\S]*?)\n\[\[ end_delivery_data \]\]/,
    );

    if (orderData === null || deliveryData === null) {
      return {
        orderData: null,
        deliveryData: null,
      };
    }

    response.replace(orderData[0], '').replace(deliveryData[0], '');

    console.log(orderData);
    return {
      orderData,
      deliveryData,
    };
  }

  async getChatHistory(data: messageData) {
    console.log('Getting chat history:', data);

    return [];
  }

  async queueMessage(message: object, threadID: string) {
    console.log('Queueing message:');
    const date = Date.now();

    // add message to redis queue
    this.firebaseService.rdb
      .ref(`chat/${threadID}/${date}`)
      .set(JSON.stringify(message));
    // console.log('Message queued:', res);
  }

  @OnEvent('chat.received')
  async handleMessage(data: any) {
    console.log('Handling chat received:', data);
    let userParts = Object.entries(data.data).map(([, value]) =>
      JSON.parse(value as string).role === 'user'
        ? JSON.parse(value as string).parts[0].text
        : null,
    );

    userParts = userParts.filter((part) => part !== null);

    const history = Object.entries(data.data).map(([, value]) => ({
      role: JSON.parse(value as string).role,
      parts: JSON.parse(value as string).parts,
    }));

    console.log('history:', history);

    const chat = userParts.length
      ? this.model.startChat({ history })
      : this.model.startChat({
          history: [],
          generationConfig: {
            maxOutputTokens: 1,
          },
        });

    const msg = '';

    const result = await chat.sendMessage(msg);
    const response = await result.response;
    const text = response.text();

    console.log('Response:', text);
    await this.queueMessage({ role: 'model', parts: [{ text }] }, data.key);
  }

  @OnEvent('chat.send')
  async handleSend(data: any) {
    const source = data.key.split('/')[0];

    console.log('Handling chat send:', data);
    const msg = data.data.parts[0].text;
    console.log('Sending chat message:', msg);

    if (source === 'instagram') {
      return this.sendReplyInstagram({
        reply: msg,
        to: data.key.split('/')[1],
      });
    } else {
      this.sendReply({
        business_phone_number_id: data.key.split('-')[0],
        reply: msg,
        to: data.key.split('-')[1],
      });
    }
  }

  async createThread() {}
}
