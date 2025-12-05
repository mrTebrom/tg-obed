import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

import { UserDB } from './db/user.db';
import { UserService } from './service/user.service';

import { startCommand } from './command/start.command';
import { MenuService } from './command/menu.command';

import { LunchDB } from './db/lunch.db';
import { LunchService } from './service/lunch.service';
import { lunchCommand } from './command/lunch.command';

import { adminCommand } from './command/admin.command';
// Загружаем переменные окружения
dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN не найден в .env');
}

// --- BOT ---
const bot = new TelegramBot(token, { polling: true });

// --- DB ---
const userDB = new UserDB();
userDB.init();

const lunchDB = new LunchDB();
lunchDB.init();

// --- SERVICE ---
const menuService = new MenuService(bot);
const userService = new UserService(userDB);
const lunchService = new LunchService(lunchDB, userDB);

// --- COMMANDS ---
startCommand(bot, userService, menuService);
lunchCommand(bot, lunchService);
adminCommand(bot, lunchService, userService);

console.log('Бот запущен...');
