import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [UserService],
})
export class UserModule {}
