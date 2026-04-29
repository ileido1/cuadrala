import { ListMatchChatMessagesUseCase } from '../../application/use_cases/list_match_chat_messages.use_case.js';
import { ListTournamentChatMessagesUseCase } from '../../application/use_cases/list_tournament_chat_messages.use_case.js';
import { PostMatchChatMessageUseCase } from '../../application/use_cases/post_match_chat_message.use_case.js';
import { PostTournamentChatMessageUseCase } from '../../application/use_cases/post_tournament_chat_message.use_case.js';
import { PrismaChatMessageRepository } from '../../infrastructure/adapters/prisma_chat_message_repository.js';
import { PrismaChatThreadRepository } from '../../infrastructure/adapters/prisma_chat_thread_repository.js';
import { PrismaMatchReadRepository } from '../../infrastructure/adapters/prisma_match_read_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';

const MATCH_READ_REPOSITORY = new PrismaMatchReadRepository();
const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const CHAT_THREAD_REPOSITORY = new PrismaChatThreadRepository();
const CHAT_MESSAGE_REPOSITORY = new PrismaChatMessageRepository();

export const POST_MATCH_CHAT_MESSAGE_UC = new PostMatchChatMessageUseCase(
  MATCH_READ_REPOSITORY,
  CHAT_THREAD_REPOSITORY,
  CHAT_MESSAGE_REPOSITORY,
);

export const LIST_MATCH_CHAT_MESSAGES_UC = new ListMatchChatMessagesUseCase(
  MATCH_READ_REPOSITORY,
  CHAT_THREAD_REPOSITORY,
  CHAT_MESSAGE_REPOSITORY,
);

export const POST_TOURNAMENT_CHAT_MESSAGE_UC = new PostTournamentChatMessageUseCase(
  TOURNAMENT_REPOSITORY,
  CHAT_THREAD_REPOSITORY,
  CHAT_MESSAGE_REPOSITORY,
);

export const LIST_TOURNAMENT_CHAT_MESSAGES_UC = new ListTournamentChatMessagesUseCase(
  TOURNAMENT_REPOSITORY,
  CHAT_THREAD_REPOSITORY,
  CHAT_MESSAGE_REPOSITORY,
);

