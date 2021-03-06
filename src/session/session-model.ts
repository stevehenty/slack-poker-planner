import { ISlackChatPostMessageResponse } from '../vendor/slack-api-interfaces';
import * as logger from '../lib/logger';
import * as redis from '../lib/redis';
import { promisify } from 'util';
import { Trace, getSpan } from '../lib/trace-decorator';

export interface ISessionMention {
  type: 'user' | 'special' | 'user-group';
  id: string;
}

export interface ISession {
  /**
   * Random generated session id.
   */
  id: string;
  /**
   * Title of the session. Mentions are excluded.
   */
  title: string;
  /**
   * Slack Channel ID.
   */
  channelId: string;
  /**
   * Slack User ID who starts this session.
   */
  userId: string;
  /**
   * Poker point values.
   */
  points: string[];
  /**
   * List of User IDs resolved from used mentions.
   */
  participants: string[];
  /**
   * Votes like { U2147483697: '3', U2147483698: '2' }
   */
  votes: { [key: string]: string };
  /**
   * Session state.
   */
  state: 'active' | 'revealed' | 'cancelled';
  /**
   * The result of `chat.postMessage` that sent by our bot to
   * the channel/conversation to /pp command used in.
   */
  rawPostMessageResponse: ISlackChatPostMessageResponse;
  /**
   * Whether this session is protected, which means only the owner
   * can cancel and reveal session.
   */
  protected: boolean;
}

export class SessionStore {
  @Trace()
  static async findById(id: string): Promise<ISession> {
    const span = getSpan();
    span?.setAttribute('id', id);
    const client = redis.getSingleton();
    const getAsync = promisify(client.get.bind(client));
    const rawSession = await getAsync(buildRedisKey(id));
    if (!rawSession) return;
    return JSON.parse(rawSession);
  }

  @Trace()
  static async upsert(session: ISession) {
    const span = getSpan();
    span?.setAttribute('id', session.id);
    const client = redis.getSingleton();
    const setAsync = promisify(client.set.bind(client));
    await setAsync(
      buildRedisKey(session.id),
      JSON.stringify(session),
      'EX',
      Number(process.env.SESSION_TTL)
    );
  }

  @Trace()
  static async delete(id: string) {
    const span = getSpan();
    span?.setAttribute('id', id);
    const client = redis.getSingleton();
    const delAsync = promisify(client.del.bind(client));
    await delAsync(buildRedisKey(id));
  }
}

function buildRedisKey(sessionId: string) {
  return `${process.env.REDIS_NAMESPACE}:session:${sessionId}`;
}
