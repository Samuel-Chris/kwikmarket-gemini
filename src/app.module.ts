import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { RedisModule } from './redis/redis.module';
import { FirebaseModule } from './firebase/firebase.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ChatModule, RedisModule, FirebaseModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
