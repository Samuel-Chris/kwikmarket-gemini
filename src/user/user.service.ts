import { Injectable } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
// import { UUID as v4 } from 'uuid';

type user = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  social_ids: object;
  social_threads: object;
  created_at: Date;
};

@Injectable()
export class UserService {
  constructor(private firebaseService: FirebaseService) {
    this.firebaseService = firebaseService;
  }

  async createUser(data: user) {
    return this.firebaseService.writeData('users', data);
  }

  async parseAddress(genAI, address: string) {
    return genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      systemInstruction: address,
    });
  }

  async createThread(data: user) {
    return this.firebaseService.writeData('threads', data);
  }

  async getOrCreateUser(platform, userHandle, data: user) {
    console.log('Getting or creating user:', data);

    const user = await this.firebaseService.db
      .collection('users')
      .where(`social_ids.${platform}`, '==', userHandle)
      .get();

    if (!user.exists) {
      return this.createUser(data);
    }

    return user;
  }

  async getOrCreateThread(platform, userHandle, data: user) {
    console.log('Getting or creating thread:', data);

    const thread = await this.firebaseService.db
      .collection('threads')
      .where(`social_ids.${platform}`, '==', userHandle)
      .get();

    if (!thread.exists) {
      return this.createThread(data);
    }

    return thread;
  }
}
