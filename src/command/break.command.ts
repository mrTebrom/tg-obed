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
  const text = msg.text;

  // Реагируем только на кнопку "Перерыв"
  if (text !== 'Перерыв') return;

  // --- ПРОВЕРКА 1: Регистрация ---
  if (!userService.isUserRegistered(tid)) {
   bot.sendMessage(chatId, 'Вы не зарегистрированы. Напишите /start');
   return;
  }

  // --- ПРОВЕРКА 2: Время доступности ---
  if (isBreakTime()) {
   bot.sendMessage(chatId, 'Перерывы доступны с 11:00 до 21:00 ⏰');
   return;
  }

  // Проверяем выбран ли режим
  const mode = breakService.getMode(tid);

  // --- ПРОВЕРКА 3: Уже на перерыве? ---
  const activeRecord = breakService.getActiveBreakByTid(tid);
  if (activeRecord) {
   bot.sendMessage(chatId, `Вы уже на перерыве. Он закончится в *${new Date(activeRecord.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}*.`, { parse_mode: 'Markdown' });
   return;
  }

  // Если режим уже выбран → СРАЗУ ЗАПУСКАЕМ ПЕРЕРЫВ
  if (mode) {
   // --- ПРОВЕРКА 4: Свободен ли перерыв? (Лимит 1 человек) ---
   const canStart = breakService.canStartBreak();
   if (!canStart.can) {
    bot.sendMessage(chatId, canStart.message || 'Перерыв занят другим пользователем. Пожалуйста, подождите.');
    return;
   }

   // Запуск перерыва с улучшенным сообщением
   const result = breakService.startBreak(tid);

   if (result.success) {
    // Улучшенное информативное сообщение о начале
    const breakMsg = `🚀 *Перерыв начался! (${mode} мин)*\n\n` + `Начало: *${result.startTime}*\n` + `Ожидаемое окончание: *${result.endTime}*\n\n` + `Не забудьте вернуться вовремя!`;
    bot.sendMessage(chatId, breakMsg, { parse_mode: 'Markdown' });
   } else {
    bot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
   }

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
  const tid = query.from.id;

  // --- ПРОВЕРКА 1: Регистрация ---
  if (!userService.isUserRegistered(tid)) {
   bot.sendMessage(chatId, 'Вы не зарегистрированы. Напишите /start');
   bot.answerCallbackQuery(query.id);
   return;
  }

  // --- ВЫБОР РЕЖИМА (choose_mode_) ---
  if (data.startsWith('choose_mode_')) {
   const parts = data.split('_');
   const mode = parts[2] as '10' | '15';

   // Сначала устанавливаем режим
   const reply = breakService.chooseMode(tid, mode);
   bot.sendMessage(chatId, reply);

   // Если режим успешно выбран, сразу запускаем перерыв
   if (!reply.startsWith('Вы не зарегистрированы')) {
    // --- ПРОВЕРКА 2: Свободен ли перерыв? (Лимит 1 человек) ---
    const canStart = breakService.canStartBreak();
    if (!canStart.can) {
     bot.sendMessage(chatId, canStart.message || 'Перерыв занят другим пользователем. Пожалуйста, подождите.');
     bot.answerCallbackQuery(query.id);
     return;
    }

    // Запуск перерыва
    const result = breakService.startBreak(tid);

    // FIX: Ошибка 2561 - используем snake_case для chatId и messageId
    bot.editMessageReplyMarkup(
     { inline_keyboard: [] },
     {
      chat_id: chatId,
      message_id: msg.message_id,
     },
    );

    if (result.success) {
     // Улучшенное информативное сообщение о начале
     const breakMsg = `🚀 *Перерыв начался! (${mode} мин)*\n\n` + `Начало: *${result.startTime}*\n` + `Ожидаемое окончание: *${result.endTime}*\n\n` + `Не забудьте вернуться вовремя!`;
     bot.sendMessage(chatId, breakMsg, { parse_mode: 'Markdown' });
    } else {
     bot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
    }
   }

   bot.answerCallbackQuery(query.id);
  }

  // --- ЛОГИКА ДРУГИХ CALLBACKS (например, admin) ---
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
