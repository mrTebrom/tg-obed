import TelegramBot from 'node-telegram-bot-api';
import { BreakService } from '../service/break.service';
import { UserService } from '../service/user.service';

export function breakCommand(bot: TelegramBot, breakService: BreakService, userService: UserService) {
 // ---------------------------------------------------------
 // ОБРАБОТКА КНОПКИ "Перерыв" (reply-кнопка)
 // ---------------------------------------------------------
 bot.on('message', (msg) => {
  if (!msg.text) return;

  // Пропускаем команды
  if (msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const tid = msg.from!.id;

  // Реагируем только на кнопку "Перерыв"
  if (msg.text !== 'Перерыв') return;

  // Проверка регистрации
  if (!userService.isUserRegistered(tid)) {
   bot.sendMessage(chatId, 'Вы не зарегистрированы. Напишите /start');
   return;
  }

  // Проверка доступности по времени
  if (isBreakTime()) {
   bot.sendMessage(chatId, 'Перерывы доступны с 11:00 до 21:00 ⏰');
   return;
  }

  // Проверяем выбран ли режим
  const mode = breakService.getMode(tid);

  // Если режим уже выбран → показываем время и запускаем перерыв
  if (mode) {
   const result = breakService.startBreak(tid);

   if (!result.success) {
    bot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
    return;
   }

   // Показываем время начала и конца
   if (result.startTime && result.endTime) {
    bot.sendMessage(chatId, `⏰ *Время перерыва:*\nНачало: *${result.startTime}*\nКонец: *${result.endTime}*`, { parse_mode: 'Markdown' });
   }

   // Показываем сообщение о начале перерыва
   bot.sendMessage(chatId, result.message);

   return;
  }

  // Если режима нет → показываем выбор (10 или 15)
  sendModeSelect(bot, chatId, tid);
 });

 // ---------------------------------------------------------
 // ОБРАБОТКА КОГДА ПОЛЬЗОВАТЕЛЬ ЖМЁТ "10 мин" или "15 мин"
 // ---------------------------------------------------------
 bot.on('callback_query', (query) => {
  const data = query.data;
  const msg = query.message;

  if (!data || !msg) return;

  const chatId = msg.chat.id;

  if (data.startsWith('choose_mode_')) {
   // Формат: choose_mode_10_937257547 или choose_mode_15_937257547
   const parts = data.split('_');
   const mode = parts[2] as '10' | '15'; // 10 или 15
   const tid = Number(parts[3]); // tid идет после mode

   // Проверка регистрации перед обработкой
   if (!userService.isUserRegistered(tid)) {
    bot.sendMessage(chatId, 'Вы не зарегистрированы. Напишите /start');
    bot.answerCallbackQuery(query.id);
    return;
   }

   const reply = breakService.chooseMode(tid, mode);
   bot.sendMessage(chatId, reply);

   // Только если режим выбран впервые — запускаем перерыв
   if (!reply.startsWith('Вы уже выбрали')) {
    const result = breakService.startBreak(tid);

    if (!result.success) {
     bot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
     bot.answerCallbackQuery(query.id);
     return;
    }

    // Показываем время начала и конца
    if (result.startTime && result.endTime) {
     bot.sendMessage(chatId, `⏰ *Время перерыва:*\nНачало: *${result.startTime}*\nКонец: *${result.endTime}*`, { parse_mode: 'Markdown' });
    }

    // Показываем сообщение о начале перерыва
    bot.sendMessage(chatId, result.message);
   }

   bot.answerCallbackQuery(query.id);
  }
 });
}

// ---------------------------------------------------------
// МЕНЮ ВЫБОРА РЕЖИМА (10 или 15 минут)
// ---------------------------------------------------------
function sendModeSelect(bot: TelegramBot, chatId: number, tid: number) {
 const keyboard = {
  reply_markup: {
   inline_keyboard: [
    [
     { text: '10 минут (4 перерыва)', callback_data: `choose_mode_10_${tid}` },
     { text: '15 минут (3 перерыва)', callback_data: `choose_mode_15_${tid}` },
    ],
   ],
  },
 };

 bot.sendMessage(chatId, 'Выберите длительность перерыва:\n' + '— 10 минут: доступно *4* перерыва\n' + '— 15 минут: доступно *3* перерыва\n\n' + 'Перерыв доступен с *11:00 до 21:00* ⏰', { parse_mode: 'Markdown', ...keyboard });
}

// ---------------------------------------------------------
// ПРОВЕРКА ВРЕМЕНИ (11:00–21:00)
// ---------------------------------------------------------
function isBreakTime() {
 const now = new Date();
 const hour = now.getHours();
 return hour >= 11 && hour < 21;
}
