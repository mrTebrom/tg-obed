import TelegramBot from 'node-telegram-bot-api';
import { BreakService } from '../service/break.service';
import { UserService } from '../service/user.service';

export function breakCommand(bot: TelegramBot, breakService: BreakService, userService: UserService) {
 // ------------------------------
 // /break_mode — выбор режима
 // ------------------------------
 bot.onText(/\/break_mode/, (msg) => {
  const chatId = msg.chat.id;
  const tid = msg.from!.id;

  // если нет юзера, остановить
  if (!userService.isUserRegistered(tid)) {
   bot.sendMessage(chatId, 'Вы не зарегистрированы. Напишите /start');
   return;
  }

  const keyboard = {
   reply_markup: {
    inline_keyboard: [
     [
      { text: '10 минут × 4', callback_data: `mode_10_${tid}` },
      { text: '15 минут × 3', callback_data: `mode_15_${tid}` },
     ],
    ],
   },
  };

  bot.sendMessage(chatId, 'Выберите режим перерывов:', keyboard);
 });

 // ------------------------------
 // /break — начать перерыв
 // ------------------------------
 bot.onText(/\/break$/, (msg) => {
  const chatId = msg.chat.id;
  const tid = msg.from!.id;

  if (!userService.isUserRegistered(tid)) {
   bot.sendMessage(chatId, 'Вы не зарегистрированы. Напишите /start');
   return;
  }

  const reply = breakService.startBreak(tid);
  bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
 });

 // ------------------------------
 // Кнопка "Перерыв" из меню
 // ------------------------------
 bot.on('message', (msg) => {
  if (msg.text !== 'Перерыв') return;

  const chatId = msg.chat.id;
  const tid = msg.from!.id;

  const reply = breakService.startBreak(tid);
  bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
 });

 // ------------------------------
 // Inline кнопки режима
 // ------------------------------
 bot.on('callback_query', (query) => {
  const data = query.data;
  const msg = query.message;

  if (!data || !msg) return;

  const chatId = msg.chat.id;

  // ----- выбор режима -----
  if (data.startsWith('mode_')) {
   const parts = data.split('_'); // mode, 10, tid
   const mode = parts[1] as '10' | '15';
   const tid = Number(parts[2]);

   const reply = breakService.chooseMode(tid, mode);
   bot.sendMessage(chatId, reply);

   bot.answerCallbackQuery(query.id);
  }
 });
}
