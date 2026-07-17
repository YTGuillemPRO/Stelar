const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// 1. Mini servidor web para mantener a Render despierto
const app = express();
app.get('/', (req, res) => res.send('¡Stelar está online y funcionando!'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor web escuchando en el puerto ${port}`));

// 2. Configuración de Stelar
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.on('ready', () => {
    console.log(`¡Conectado a Discord como ${client.user.tag}!`);
});

// 3. Comando !ban
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!ban')) {
        if (!message.member.permissions.has('BanMembers')) {
            return message.reply('No tienes permisos para banear.');
        }
        
        const userToBan = message.mentions.members.first();
        if (!userToBan) {
            return message.reply('Menciona al usuario que quieres banear. Ejemplo: `!ban @usuario`');
        }
        
        try {
            await userToBan.ban({ reason: 'Baneado por el comando !ban de Stelar' });
            message.reply(`¡🔨 **${userToBan.user.tag}** ha sido baneado del servidor!`);
        } catch (error) {
            message.reply('Error: No pude banear a este usuario. Asegúrate de que mi rol de Bot esté por encima del suyo.');
        }
    }
});

// Arrancar el bot con el token secreto que pondremos en Render
client.login(process.env.TOKEN);
