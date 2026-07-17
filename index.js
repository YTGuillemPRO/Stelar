const { 
    Client, 
    GatewayIntentBits, 
    ApplicationCommandOptionType, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
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
        name: 'help',
        description: 'Muestra la lista de comandos disponibles'
    },
    {
        name: 'ban',
        description: 'Banea a un usuario del servidor',
        options: [
            { name: 'usuario', description: 'El usuario que quieres banear', type: ApplicationCommandOptionType.User, required: true },
            { name: 'razon', description: '¿Por qué lo baneas?', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'kick',
        description: 'Expulsa a un usuario del servidor',
        options: [
            { name: 'usuario', description: 'El usuario que quieres expulsar', type: ApplicationCommandOptionType.User, required: true },
            { name: 'razon', description: '¿Por qué lo expulsas?', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'clear',
        description: 'Borra una cantidad de mensajes en este canal',
        options: [
            { name: 'cantidad', description: 'Número de mensajes a borrar (1-100)', type: ApplicationCommandOptionType.Integer, required: true, min_value: 1, max_value: 100 }
        ]
    },
    {
        name: 'userinfo',
        description: 'Muestra información sobre un usuario',
        options: [
            { name: 'usuario', description: 'El usuario del que quieres ver la info', type: ApplicationCommandOptionType.User, required: false }
        ]
    },
    {
        name: 'serverinfo',
        description: 'Muestra información sobre el servidor actual'
    }
];

// 4. Registrar los comandos cuando Stelar se enciende
client.on('ready', async () => {
    console.log(`¡Conectado a Discord como ${client.user.tag}!`);
    try {
        console.log('Inyectando los comandos de barra en Discord...');
        await client.application.commands.set(comandosDeBarra);
        console.log('¡Comandos de barra registrados con éxito!');
    } catch (error) {
        console.error('Error al registrar comandos:', error);
    }
});

// 5. Manejador de interacciones (Slash Commands)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild } = interaction;

    switch (commandName) {
        case 'ping': {
            const embed = new EmbedBuilder()
                .setTitle('🏓 Pong!')
                .setDescription(`Latencia: **${client.ws.ping}ms**`)
                .setColor('Green');
            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'help': {
            const helpEmbed = new EmbedBuilder()
                .setTitle('🤖 Menú de Ayuda de Stelar')
                .setColor('Blurple')
                .addFields(
                    { name: '🛠️ Moderación', value: '`/ban` - Banea a un usuario.\n`/kick` - Expulsa a un usuario.\n`/clear` - Borra mensajes.' },
                    { name: 'ℹ️ Información', value: '`/ping` - Muestra el ping del bot.\n`/userinfo` - Info de un usuario.\n`/serverinfo` - Info del servidor.' }
                );
            await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
            break;
        }

        case 'ban': {
            if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ content: '❌ No tienes permisos para banear.', ephemeral: true });
            }
            const usuario = options.getUser('usuario');
            const razon = options.getString('razon') || 'Sin razón especificada';

            if (usuario.id === client.user.id) return interaction.reply({ content: '❌ No puedo banearme a mí mismo.', ephemeral: true });
            if (usuario.id === interaction.user.id) return interaction.reply({ content: '❌ No puedes banear a tu mejor amigo (a ti mismo).', ephemeral: true });

            const miembro = await guild.members.fetch(usuario.id).catch(() => null);
            if (!miembro) return interaction.reply({ content: '❌ Ese usuario no está en el servidor.', ephemeral: true });

            try {
                await miembro.ban({ reason: razon });
                const embed = new EmbedBuilder()
                    .setTitle('🔨 Usuario Baneado')
                    .setColor('Red')
                    .addFields(
                        { name: 'Usuario', value: `${usuario.tag} (${usuario.id})` },
                        { name: 'Moderador', value: interaction.user.tag },
                        { name: 'Razón', value: razon }
                    );
                await interaction.reply({ embeds: [embed] });
            } catch {
                await interaction.reply({ content: '❌ Error: No pude banear a este usuario. Revisa mi jerarquía de roles.', ephemeral: true });
            }
            break;
        }

        case 'kick': {
            if (!member.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interaction.reply({ content: '❌ No tienes permisos para expulsar.', ephemeral: true });
            }
            const usuario = options.getUser('usuario');
            const razon = options.getString('razon') || 'Sin razón especificada';

            const miembro = await guild.members.fetch(usuario.id).catch(() => null);
            if (!miembro) return interaction.reply({ content: '❌ Ese usuario no está en el servidor.', ephemeral: true });

            try {
                await miembro.kick(razon);
                const embed = new EmbedBuilder()
                    .setTitle('👢 Usuario Expulsado')
                    .setColor('Orange')
                    .addFields(
                        { name: 'Usuario', value: `${usuario.tag} (${usuario.id})` },
                        { name: 'Moderador', value: interaction.user.tag },
                        { name: 'Razón', value: razon }
                    );
                await interaction.reply({ embeds: [embed] });
            } catch {
                await interaction.reply({ content: '❌ Error: No pude expulsar a este usuario. Revisa mi jerarquía de roles.', ephemeral: true });
            }
            break;
        }

        case 'clear': {
            if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: '❌ No tienes permisos para gestionar mensajes.', ephemeral: true });
            }
            const cantidad = options.getInteger('cantidad');

            try {
                // +1 para borrar también el mensaje del comando del bot
                const mensajesBorrados = await interaction.channel.bulkDelete(cantidad + 1, true);
                
                const embed = new EmbedBuilder()
                    .setColor('Blue')
                    .setDescription(`🧹 ¡He borrado **${mensajesBorrados.size - 1}** mensajes!`);
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch {
                await interaction.reply({ content: '❌ Ocurrió un error al borrar los mensajes. (No puedo borrar mensajes de más de 14 días).', ephemeral: true });
            }
            break;
        }

        case 'userinfo': {
            const usuario = options.getUser('usuario') || interaction.user;
            const miembro = await guild.members.fetch(usuario.id).catch(() => null);
            
            if (!miembro) return interaction.reply({ content: 'Ese usuario no está en el servidor.', ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle(`ℹ️ Información de ${usuario.username}`)
                .setThumbnail(usuario.displayAvatarURL({ dynamic: true }))
                .setColor('Purple')
                .addFields(
                    { name: '🆔 ID', value: usuario.id, inline: true },
                    { name: '📅 Cuenta creada', value: `<t:${Math.floor(usuario.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '🚪 Se unió', value: `<t:${Math.floor(miembro.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: '🎭 Roles', value: miembro.roles.cache.map(r => r).join(', ').replace('@everyone', ' ') || 'Ninguno' }
                );
            await interaction.reply({ embeds: [embed] });
            break;
        }

        case 'serverinfo': {
            const embed = new EmbedBuilder()
                .setTitle(`ℹ️ Información de ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setColor('Gold')
                .addFields(
                    { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
                    { name: '🆔 ID del Servidor', value: guild.id, inline: true },
                    { name: '👥 Miembros', value: `${guild.memberCount}`, inline: true },
                    { name: '📅 Creado el', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
                );
            await interaction.reply({ embeds: [embed] });
            break;
        }
    }
});

// Arrancar el bot
client.login(process.env.TOKEN);
