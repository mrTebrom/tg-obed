import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN не найден в переменных окружения');
}

// Создаем экземпляр бота
const bot = new TelegramBot(token, { polling: true });

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привет! Я твой Telegram бот на TypeScript 🤖');
});

// Обработчик команды /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
Доступные команды:
/start - Запустить бота
/help - Показать это сообщение
/echo <текст> - Повторить текст
  `;
    bot.sendMessage(chatId, helpText);
});

// Обработчик команды /echo
bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const resp = match?.[1] || 'Нет текста для повтора';
    bot.sendMessage(chatId, resp);
});

// Обработчик всех остальных сообщений
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Игнорируем команды (они обрабатываются выше)
    if (text?.startsWith('/')) {
        return;
    }

    bot.sendMessage(chatId, `Ты написал: ${text}`);
});

console.log('Бот запущен...');
