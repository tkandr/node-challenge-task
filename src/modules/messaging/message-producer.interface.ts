import { TokenPriceUpdateMessage } from './models/token-price-update-message';

/**
 * Generic interface for message producers.
 * This abstraction allows switching between different messaging protocols
 * (Kafka, ZeroMQ, RabbitMQ, etc.) without changing business logic.
 */
export interface IMessageProducer {
  /**
   * Sends a token price update message to the messaging system.
   * @param message - The token price update message to send
   * @throws Error if message sending fails
   */
  sendPriceUpdateMessage(message: TokenPriceUpdateMessage): Promise<void>;

  /**
   * Connects to the messaging system.
   * Called automatically on module initialization.
   */
  connect(): Promise<void>;

  /**
   * Disconnects from the messaging system.
   * Called automatically on module destruction.
   */
  disconnect(): Promise<void>;
}

/**
 * Injection token for the message producer.
 * Use this token to inject the message producer implementation.
 */
export const MESSAGE_PRODUCER = Symbol('MESSAGE_PRODUCER');
