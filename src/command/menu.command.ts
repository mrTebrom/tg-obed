import TelegramBot from 'node-telegram-bot-api';

export class MenuService {
    constructor(private bot: TelegramBot) {}

    sendMenu(chatId: number, text: string = 'Главное меню:') {
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
}
