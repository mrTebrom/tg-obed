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

   let adminText = `📋 *Расписание обедов (кто когда)*\n\n`;

   for (const slotInfo of list) {
    const users = slotInfo.users;

    if (users.length === 0) {
     adminText += `• ${slotInfo.slot}: _никого_\n`;
    } else {
     adminText += `• ${slotInfo.slot}:\n`;
     for (const u of users) {
      adminText += `    — ${u.name}\n`;
     }
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

   let historyText = `📊 *Расписание перерывов (кто выходил когда)*\n\n`;

   for (const userHistory of history) {
    historyText += `• ${userHistory.name}:\n`;
    for (const startTime of userHistory.breaks) {
     const date = new Date(startTime);
     const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
     historyText += `    — ${timeStr}\n`;
    }
   }

   this.bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
   return;
  }

  if (text === '✅ Кто свободен') {
   const freeUsers = this.breakService.getFreeUsers();

   if (freeUsers.length === 0) {
    this.bot.sendMessage(chatId, 'Сейчас все заняты (на обеде или на перерыве).');
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

    freeText += `${roleEmoji[user.role as keyof typeof roleEmoji] || '👤'} ${user.name}\n`;
   }

   this.bot.sendMessage(chatId, freeText, { parse_mode: 'Markdown' });
   return;
  }
 }
}
