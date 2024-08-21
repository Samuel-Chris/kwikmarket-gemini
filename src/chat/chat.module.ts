import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { ChatController } from './chat.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [FirebaseModule, HttpModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
