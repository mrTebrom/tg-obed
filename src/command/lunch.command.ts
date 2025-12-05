import TelegramBot from 'node-telegram-bot-api';
import { LunchService } from '../service/lunch.service';

export function lunchCommand(bot: TelegramBot, lunchService: LunchService) {
    // Вывод слотов
    const sendSlots = (chatId: number) => {
        const slots = lunchService.getSlots();

        let text = 'Выберите слот на обед 🍽️\n\n';
        for (const [slot, count] of Object.entries(slots)) {
            text += `${slot} — занято: ${count}/2\n`;
        }

        const keyboard = {
            reply_markup: {
                inline_keyboard: Object.entries(slots).map(([slot, count]) => [
                    {
                        text: `${slot} (${count}/2)`,
                        callback_data: `lunch_${slot}`,
                    },
                ]),
            },
        };

        bot.sendMessage(chatId, text, keyboard);
    };

    // Команда /lunch
    bot.onText(/\/lunch/, (msg) => {
        sendSlots(msg.chat.id);
    });

    // Нажатие кнопки "Обед" в меню
    bot.on('message', (msg) => {
        if (msg.text === 'Обед') {
            sendSlots(msg.chat.id);
        }
    });

    // Обработка inline-кнопок выбора слота
    bot.on('callback_query', (query) => {
        if (!query.data || !query.message) return;

        // начинается с lunch_
        if (!query.data.startsWith('lunch_')) return;

        const slot = query.data.replace('lunch_', '');
        const tid = query.from.id;

        const reply = lunchService.bookLunch(tid, slot);

        bot.sendMessage(query.message.chat.id, reply);
        bot.answerCallbackQuery(query.id);
    });
}
