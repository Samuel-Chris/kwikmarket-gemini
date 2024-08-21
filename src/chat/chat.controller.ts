import {
  Controller,
  Get,
  Request,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    private httpService: HttpService,
    private chatService: ChatService,
  ) {}

  @Get('webhooks/:source')
  async respond(@Request() req) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // check the mode and token sent are correct
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      // respond with 200 OK and challenge token from the request

      console.log('Webhook verified successfully!');
      return challenge;
    } else {
      // respond with '403 Forbidden' if verify tokens do not match
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }

  @Post('webhooks/ig')
  async igWebhook(@Request() req) {
    console.log('Instagram webhook received a message!');

    const payload = req.body.entry[0].messaging;

    const messages = payload.map((message) => message.message.text);
    console.log(messages, payload[0].recipient.id);

    await this.chatService.queueMessage(
      { role: 'user', parts: messages.map((msg) => ({ text: msg })) },
      `instagram/${payload[0].sender.id}`,
    );

    return 'EVENT_RECEIVED';
  }

  @Post('webhook')
  async receive(@Request() req) {
    console.log('Webhook received a message!');

    const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
    console.log(message);

    if (!message) {
      return 'EVENT_RECEIVED';
    }

    // if message.timestamp is more than 10 seconds old, ignore it
    const timestamp = message.timestamp;
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 10) {
      console.log('Message is too old!');
      return 'EVENT_RECEIVED';
    }

    const business_phone_number_id =
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

    await this.chatService.queueMessage(
      { role: 'user', parts: [{ text: message.text.body }] },
      `${business_phone_number_id}-${message.from}`,
    );

    return 'EVENT_RECEIVED';
  }
}
