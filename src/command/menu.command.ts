import TelegramBot from 'node-telegram-bot-api';
import { UserService } from '../service/user.service';
import { LunchService } from '../service/lunch.service';
import { BreakService } from '../service/break.service';

export class MenuService {
 constructor(private bot: TelegramBot, private userService: UserService, private lunchService: LunchService, private breakService: BreakService) {}

 sendMenu(chatId: number, tid: number, text: string = 'Главное меню:') {
  // Если пользователь админ, показываем специальное меню с 4 кнопками
  if (this.userService.hasAdminAccess(tid)) {
   const menu = {
    reply_markup: {
     keyboard: [[{ text: '📋 Расписание обедов' }], [{ text: '☕ Кто на перерыве' }], [{ text: '📊 Расписание перерывов' }], [{ text: '✅ Кто свободен' }], [{ text: 'Профиль' }, { text: 'О боте' }]],
     resize_keyboard: true,
    },
   };

   this.bot.sendMessage(chatId, text, menu);
   return;
  }

  // Обычное меню для не-админов
  const menu = {
   reply_markup: {
    keyboard: [
     [{ text: 'Профиль' }, { text: 'О боте' }],
     [{ text: 'Перерыв' }, { text: 'Обед' }],
    ],
    resize_keyboard: true,
   },
  };

  this.bot.sendMessage(chatId, text, menu);
 }

 // Обработка админских кнопок
 handleAdminMenu(chatId: number, text: string) {
  if (text === '📋 Расписание обедов') {
   const list = this.lunchService.getLunchList();

   if (list.length === 0) {
    this.bot.sendMessage(chatId, 'Сегодня записей на обед нет.');
    return;
   }

   let adminText = `📋 *Расписание обедов*\n\n`;

   for (const slotInfo of list) {
    const users = slotInfo.users;

    if (users.length === 0) {
     adminText += `• *${slotInfo.slot}*: _никого_\n`;
    } else {
     // Форматируем список пользователей красиво
     const userNames = users.map((u) => `*${u.name}*`).join(', ');
     adminText += `• *${slotInfo.slot}*: ${userNames}\n`;
    }
   }

   this.bot.sendMessage(chatId, adminText, { parse_mode: 'Markdown' });
   return;
  }

  if (text === '☕ Кто на перерыве') {
   const activeBreaks = this.breakService.getActiveBreaks();

   if (activeBreaks.length === 0) {
    this.bot.sendMessage(chatId, 'Сейчас никто не на перерыве.');
    return;
   }

   let breakText = `☕ *Кто на перерыве*\n\n`;

   for (const breakInfo of activeBreaks) {
    const startTime = new Date(breakInfo.start).getTime();
    const duration = Math.floor((Date.now() - startTime) / 1000 / 60); // минуты
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const timeStr = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;

    breakText += `• ${breakInfo.name} (${timeStr})\n`;
   }

   this.bot.sendMessage(chatId, breakText, { parse_mode: 'Markdown' });
   return;
  }

  if (text === '📊 Расписание перерывов') {
   const history = this.breakService.getBreakHistory();

   if (history.length === 0) {
    this.bot.sendMessage(chatId, 'Сегодня перерывов не было.');
    return;
   }

   let historyText = `📊 *Расписание перерывов*\n\n`;

   // Сортируем по времени начала (от старых к новым)
   const sortedHistory = [...history].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

   for (const record of sortedHistory) {
    const startTime = new Date(record.start);
    const endTime = new Date(record.end);
    const startStr = startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const endStr = endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    historyText += `• *${record.name}* | ${startStr} - ${endStr}\n`;
   }

   this.bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
   return;
  }

  if (text === '✅ Кто свободен') {
   const freeUsers = this.breakService.getFreeUsers();
   const activeBreaks = this.breakService.getActiveBreaks();
   const lunchList = this.lunchService.getLunchList();

   // Подсчитываем сколько людей на обеде (только тех, у кого текущее время попадает в слот)
   let onLunchCount = 0;
   const onLunchNames: string[] = [];
   const now = new Date();
   const currentHour = now.getHours();
   const currentMinute = now.getMinutes();
   const currentTime = currentHour * 60 + currentMinute;

   for (const slot of lunchList) {
    // Парсим слот (формат: "12:00-13:00")
    const [startStr, endStr] = slot.slot.split('-');
    if (!startStr || !endStr) continue;

    const [startHour, startMin] = startStr.split(':').map(Number);
    const [endHour, endMin] = endStr.split(':').map(Number);

    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
     continue;
    }

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Проверяем, попадает ли текущее время в диапазон слота
    if (currentTime >= startTime && currentTime < endTime) {
     for (const user of slot.users) {
      onLunchCount++;
      if (!onLunchNames.includes(user.name)) {
       onLunchNames.push(user.name);
      }
     }
    }
   }

   if (freeUsers.length === 0) {
    // Более точное сообщение о том, почему все заняты
    const reasons: string[] = [];
    if (activeBreaks.length > 0) {
     const breakNames = activeBreaks.map((b) => b.name).join(', ');
     reasons.push(`на перерыве: ${breakNames}`);
    }
    if (onLunchCount > 0) {
     reasons.push(`на обеде: ${onLunchNames.join(', ')}`);
    }

    if (reasons.length > 0) {
     this.bot.sendMessage(chatId, `Сейчас все заняты:\n${reasons.join('\n')}`);
    } else {
     this.bot.sendMessage(chatId, 'Сейчас все заняты.');
    }
    return;
   }

   let freeText = `✅ *Кто свободен*\n\n`;

   for (const user of freeUsers) {
    const roleEmoji = {
     admin: '👑',
     pk: '🍳',
     cashier: '💰',
     user: '👤',
    };

    freeText += `${roleEmoji[user.role as keyof typeof roleEmoji] || '👤'} *${user.name}*\n`;
   }

   this.bot.sendMessage(chatId, freeText, { parse_mode: 'Markdown' });
   return;
  }
 }
}
