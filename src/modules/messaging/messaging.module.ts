import { Module } from '@nestjs/common';

import { KafkaProducerService } from './kafka-producer.service';
import { MESSAGE_PRODUCER } from './message-producer.interface';

@Module({
  providers: [
    {
      provide: MESSAGE_PRODUCER,
      useClass: KafkaProducerService,
    },
  ],
  exports: [MESSAGE_PRODUCER],
})
export class MessagingModule {}
