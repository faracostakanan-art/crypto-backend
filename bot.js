const TelegramBot = require('node-telegram-bot-api');

// ton token
const token = '8660404507:AAHR_rohewnnFjZKlR443cLbuhbYiNO1BPg';

// création du bot
const bot = new TelegramBot(token, { polling: true });

// message /start
const welcomeMessage = `
⚠️ Conditions d'utilisation :

1. Toutes les transactions sont finales.
2. Vous êtes responsable de vos achats.
3. Respectez les règles de la plateforme.
4. Pour les refund  @MALUSAINT uniquement si le RF est nécessaire.

POUR LES NEW UTILISATEURS :

Au premier dépôt de 200€ bénéficier de 100€ supplémentaires
DM : @MALUSAINT

ACCÈDE À LA BOUTIQUE EN BAS À GAUCHE.
`;

// commande /start
bot.onText(/\/start/, (msg) => {

const chatId = msg.chat.id;

bot.sendMessage(chatId, welcomeMessage);

});

console.log("Bot lancé...");
