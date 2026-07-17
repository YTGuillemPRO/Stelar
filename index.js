const { Client, GatewayIntentBits, ApplicationCommandOptionType } = require('discord.js');
const express = require('express');

// 1. Servidor web para mantener a Render y UptimeRobot felices
const app = express();
app.get('/', (req, res) => res.send('¡Stelar está online y funcionando con Slash Commands!'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor web en el puerto ${port}`));

// 2. Configuración de Stelar
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 3. Definimos el menú de comandos de barra
const comandosDeBarra = [
    {
        name: 'ping',
        description: 'Comprueba si Stelar está vivo y responde rápido'
    },
    {
        name: 'ban',
        description: 'Banea a un usuario del servidor con el poder de Stelar',
        options: [
            {
                name: 'usuario',
                description: 'El usuario que quieres banear',
                type: ApplicationCommandOptionType.User,
                required: true
            },
            {
                name: 'razon',
                description: '¿Por qué lo baneas?',
                type: ApplicationCommandOptionType.String,
                required: false
            }
        ]
    }
];

// 4. Registrar los comandos cuando Stelar se enciende
client.on('ready', async () => {
    console.log(`¡Conectado a Discord como ${client.user.tag}!`);
    try {
        console.log('Inyectando los comandos de barra en Discord...');
        // Esto le envía el menú de comandos a Discord
        await client.application.commands.set(comandosDeBarra);
        console.log('¡Comandos de barra registrados con éxito!');
    } catch (error) {
        console.error('Error al registrar comandos:', error);
    }
});

// 5. ¿Qué hace Stelar cuando usas un comando de barra?
client.on('interactionCreate', async (interaction) => {
    // Si no es un comando de barra, ignorar
    if (!interaction.isChatInputCommand()) return;

    // --- COMANDO /PING ---
    if (interaction.commandName === 'ping') {
        await interaction.reply('¡Pong! 🏓 Mis comandos de barra funcionan a la perfección.');
    }

    // --- COMANDO /BAN ---
    if (interaction.commandName === 'ban') {
        // Comprobar permisos
        if (!interaction.member.permissions.has('BanMembers')) {
            // El 'ephemeral: true' hace que el mensaje solo lo veas tú, no todo el servidor
            return interaction.reply({ content: 'No tienes permisos para usar este comando.', ephemeral: true });
        }

        // Obtener el usuario y la razón que has rellenado en el menú
        const usuarioObjetivo = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Baneado por el comando /ban de Stelar';
        
        // Buscar a ese miembro en el servidor
        const miembroObjetivo = await interaction.guild.members.fetch(usuarioObjetivo.id).catch(() => null);

        if (!miembroObjetivo) {
            return interaction.reply({ content: 'No pude encontrar a ese usuario en el servidor.', ephemeral: true });
        }

        try {
            await miembroObjetivo.ban({ reason: razon });
            await interaction.reply(`¡🔨 **${usuarioObjetivo.tag}** ha sido baneado!\n📝 **Razón:** ${razon}`);
        } catch (error) {
            await interaction.reply({ content: 'Error: No pude banear a este usuario. Revisa que mi rol de Stelar esté por encima del suyo.', ephemeral: true });
        }
    }
});

// Arrancar el bot
client.login(process.env.TOKEN);
