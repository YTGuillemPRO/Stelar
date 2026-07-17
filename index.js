const { 
    Client, 
    GatewayIntentBits, 
    ApplicationCommandOptionType, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const express = require('express');

// 1. Servidor web para mantener a Render y UptimeRobot felices
const app = express();
app.get('/', (req, res) => res.send('¡Stelar está online y funcionando a tope!'));
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

// Base de datos en memoria (temporal, se reinicia al apagar el bot)
const db = {
    xp: {}, // Formato: { userId: { xp: 100, level: 1 } }
    cases: {}, // Formato: { caseId: { user, mod, reason, type } }
    caseCounter: 1
};

// 3. Definimos el menú de comandos de barra
const comandosDeBarra = [
    // --- GENERAL ---
    { name: 'help', description: 'Recibe una lista de comandos y recursos de ayuda' },
    { name: 'premium', description: 'Recibe opciones sobre cómo comprar ventajas premium' },
    { name: 'vote', description: 'Recibe un enlace para votar por Stelar' },
    { name: 'dashboard', description: 'Recibe un enlace para configurar Stelar' },
    { name: 'invite', description: 'Recibe un enlace para añadir a Stelar a tu servidor' },
    { name: 'support', description: 'Recibe un enlace al servidor de soporte' },
    { name: 'stats', description: 'Ver información básica sobre Stelar' },
    { name: 'serverinfo', description: 'Ver información sobre el servidor actual' },
    {
        name: 'avatar',
        description: 'Ver el avatar de un usuario',
        options: [{ name: 'usuario', description: 'El usuario cuyo avatar quieres ver', type: ApplicationCommandOptionType.User, required: false }]
    },
    {
        name: 'userinfo',
        description: 'Ver la información de un usuario',
        options: [{ name: 'usuario', description: 'El usuario a inspeccionar', type: ApplicationCommandOptionType.User, required: false }]
    },
    {
        name: 'role',
        description: 'Añade o quita un rol a un usuario',
        options: [
            { name: 'usuario', description: 'El usuario al que aplicar el rol', type: ApplicationCommandOptionType.User, required: true },
            { name: 'rol', description: 'El rol a añadir o quitar', type: ApplicationCommandOptionType.Role, required: true }
        ]
    },
    // --- LEVELING ---
    {
        name: 'level',
        description: 'Muestra tu nivel y XP o el de un miembro',
        options: [{ name: 'usuario', description: 'El usuario a consultar', type: ApplicationCommandOptionType.User, required: false }]
    },
    { name: 'leaderboard', description: 'Muestra el top 10 de miembros del servidor' },
    {
        name: 'xp',
        description: 'Añade o modifica el XP de un usuario',
        options: [
            { name: 'usuario', description: 'El usuario a modificar', type: ApplicationCommandOptionType.User, required: true },
            { name: 'cantidad', description: 'Cantidad de XP a establecer', type: ApplicationCommandOptionType.Integer, required: true, min_value: 0 }
        ]
    },
    { name: 'boosters', description: 'Muestra la lista de multiplicadores de XP' },
    { name: 'rewards', description: 'Muestra la lista de recompensas de roles' },
    { name: 'card', description: 'Administra la configuración de tu tarjeta de rango' },
    // --- MODERATION ---
    {
        name: 'warn',
        description: 'Advierte a un usuario enviándole un mensaje privado',
        options: [
            { name: 'usuario', description: 'El usuario a advertir', type: ApplicationCommandOptionType.User, required: true },
            { name: 'razon', description: 'Razón de la advertencia', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'mute',
        description: 'Silencia a un usuario (Timeout)',
        options: [
            { name: 'usuario', description: 'El usuario a silenciar', type: ApplicationCommandOptionType.User, required: true },
            { name: 'minutos', description: 'Duración del silencio en minutos', type: ApplicationCommandOptionType.Integer, required: true, min_value: 1, max_value: 10080 },
            { name: 'razon', description: 'Razón del silencio', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'kick',
        description: 'Expulsa a un usuario del servidor',
        options: [
            { name: 'usuario', description: 'El usuario a expulsar', type: ApplicationCommandOptionType.User, required: true },
            { name: 'razon', description: 'Razón de la expulsión', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'ban',
        description: 'Banea a un usuario del servidor',
        options: [
            { name: 'usuario', description: 'El usuario a banear', type: ApplicationCommandOptionType.User, required: true },
            { name: 'razon', description: 'Razón del baneo', type: ApplicationCommandOptionType.String, required: false }
        ]
    },
    {
        name: 'purge',
        description: 'Borra mensajes recientes del canal',
        options: [{ name: 'cantidad', description: 'Número de mensajes (1-100)', type: ApplicationCommandOptionType.Integer, required: true, min_value: 1, max_value: 100 }]
    },
    {
        name: 'unmute',
        description: 'Quita el silencio a un usuario',
        options: [{ name: 'usuario', description: 'El usuario a desilenciar', type: ApplicationCommandOptionType.User, required: true }]
    },
    {
        name: 'unban',
        description: 'Quita el ban a un usuario por su ID',
        options: [{ name: 'usuario_id', description: 'El ID del usuario a desbanear', type: ApplicationCommandOptionType.String, required: true }]
    },
    { name: 'lock', description: 'Bloquea el canal actual para que nadie pueda escribir' },
    { name: 'unlock', description: 'Desbloquea el canal actual' },
    {
        name: 'slowmode',
        description: 'Establece el modo lento del canal (en segundos)',
        options: [{ name: 'segundos', description: 'Segundos de espera (0 para quitar)', type: ApplicationCommandOptionType.Integer, required: false, min_value: 0, max_value: 21600 }]
    },
    {
        name: 'case',
        description: 'Ver o eliminar un caso de moderación',
        options: [
            { name: 'id_caso', description: 'El número del caso a ver/eliminar', type: ApplicationCommandOptionType.Integer, required: true, min_value: 1 },
            { name: 'accion', description: 'Qué quieres hacer con el caso', type: ApplicationCommandOptionType.String, required: true, choices: [{ name: 'Ver', value: 'view' }, { name: 'Eliminar', value: 'delete' }] }
        ]
    }
];

// 4. Registrar los comandos
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

// 5. Manejador de interacciones
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, member, guild, channel } = interaction;

    // Función helper para errores
    const errorReply = (msg) => interaction.reply({ content: `❌ ${msg}`, ephemeral: true });

    try {
        switch (commandName) {
            // ================== GENERAL ==================
            case 'help': {
                const embed = new EmbedBuilder()
                    .setTitle('📚 Comandos de Stelar')
                    .setColor('Blurple')
                    .addFields(
                        { name: '🛠️ Moderación', value: '`/warn` `/mute` `/unmute` `/kick` `/ban` `/unban` `/purge` `/lock` `/unlock` `/slowmode` `/case`' },
                        { name: '📊 Niveles', value: '`/level` `/leaderboard` `/xp` `/boosters` `/rewards` `/card`' },
                        { name: 'ℹ️ General', value: '`/avatar` `/userinfo` `/serverinfo` `/stats` `/role` `/help` `/premium` `/vote` `/dashboard` `/invite` `/support`' }
                    );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            case 'premium': return interaction.reply('💎 **Stelar Premium**\n¡Próximamente tendremos perks exclusivos! Usa `/support` para estar atento.');
            case 'vote': return interaction.reply('🗳️ ¡Apoya a Stelar votando por él en: [Enlace de votación]');
            case 'dashboard': {
                if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return errorReply('Necesitas el permiso `Gestionar Servidor`.');
                return interaction.reply('⚙️ **Panel de Control de Stelar**\nConfigura tu servidor aquí: [Enlace al Dashboard]');
            }
            case 'invite': return interaction.reply(`➕ ¡Añade a Stelar a tu servidor usando este enlace!\nhttps://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
            case 'support': return interaction.reply('🆘 ¿Necesitas ayuda? Únete a nuestro servidor de soporte: [Enlace al servidor]');
            case 'avatar': {
                const user = options.getUser('usuario') || interaction.user;
                const embed = new EmbedBuilder()
                    .setTitle(`Avatar de ${user.username}`)
                    .setImage(user.displayAvatarURL({ size: 1024, dynamic: true }))
                    .setColor('Random');
                return interaction.reply({ embeds: [embed] });
            }
            case 'stats': {
                const embed = new EmbedBuilder()
                    .setTitle('📊 Estadísticas de Stelar')
                    .setColor('Green')
                    .addFields(
                        { name: '🖥️ Servidores', value: `${client.guilds.cache.size}`, inline: true },
                        { name: '👥 Usuarios', value: `${client.users.cache.size}`, inline: true },
                        { name: '⚡ Ping', value: `${client.ws.ping}ms`, inline: true }
                    );
                return interaction.reply({ embeds: [embed] });
            }
            case 'userinfo': {
                const user = options.getUser('usuario') || interaction.user;
                const miembro = await guild.members.fetch(user.id).catch(() => null);
                if (!miembro) return errorReply('Ese usuario no está en el servidor.');
                const embed = new EmbedBuilder()
                    .setTitle(`ℹ️ Información de ${user.username}`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setColor('Purple')
                    .addFields(
                        { name: '🆔 ID', value: user.id, inline: true },
                        { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: '🚪 Se unió', value: `<t:${Math.floor(miembro.joinedTimestamp / 1000)}:R>`, inline: true },
                        { name: '🎭 Roles', value: miembro.roles.cache.map(r => r.toString()).slice(0, 15).join(', ') || 'Ninguno' }
                    );
                return interaction.reply({ embeds: [embed] });
            }
            case 'serverinfo': {
                const embed = new EmbedBuilder()
                    .setTitle(`ℹ️ Información de ${guild.name}`)
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .setColor('Gold')
                    .addFields(
                        { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
                        { name: '🆔 ID', value: guild.id, inline: true },
                        { name: '👥 Miembros', value: `${guild.memberCount}`, inline: true },
                        { name: '📅 Creado el', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
                    );
                return interaction.reply({ embeds: [embed] });
            }
            case 'role': {
                if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) return errorReply('Necesitas el permiso `Gestionar Roles`.');
                const target = options.getUser('usuario');
                const role = options.getRole('rol');
                const targetMember = await guild.members.fetch(target.id).catch(() => null);
                if (!targetMember) return errorReply('Ese usuario no está en el servidor.');
                
                if (targetMember.roles.cache.has(role.id)) {
                    await targetMember.roles.remove(role.id);
                    return interaction.reply(`✅ Le he quitado el rol ${role.name} a ${target.tag}.`);
                } else {
                    await targetMember.roles.add(role.id);
                    return interaction.reply(`✅ Le he añadido el rol ${role.name} a ${target.tag}.`);
                }
            }

            // ================== LEVELING ==================
            case 'level': {
                const user = options.getUser('usuario') || interaction.user;
                const data = db.xp[user.id] || { xp: 0, level: 0 };
                const embed = new EmbedBuilder()
                    .setTitle(`📊 Nivel de ${user.username}`)
                    .setColor('Blue')
                    .setDescription(`**Nivel:** ${data.level}\n**XP:** ${data.xp}`);
                return interaction.reply({ embeds: [embed] });
            }
            case 'leaderboard': {
                const sorted = Object.entries(db.xp).sort((a, b) => b[1].xp - a[1].xp).slice(0, 10);
                if (sorted.length === 0) return interaction.reply('Aún no hay nadie en la clasificación.');
                let desc = sorted.map((entry, i) => `**${i + 1}.** <@${entry[0]}> - Nivel ${entry[1].level} (${entry[1].xp} XP)`).join('\n');
                const embed = new EmbedBuilder().setTitle('🏆 Leaderboard del Servidor').setColor('Gold').setDescription(desc);
                return interaction.reply({ embeds: [embed] });
            }
            case 'xp': {
                if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) return errorReply('Necesitas el permiso `Gestionar Servidor`.');
                const user = options.getUser('usuario');
                const amount = options.getInteger('cantidad');
                db.xp[user.id] = { xp: amount, level: Math.floor(amount / 100) };
                return interaction.reply(`✅ El XP de ${user.tag} se ha establecido a ${amount}.`);
            }
            case 'boosters': return interaction.reply('🚀 Actualmente no hay multiplicadores de XP activos en este servidor.');
            case 'rewards': return interaction.reply('🎁 Actualmente no hay recompensas de roles configuradas.');
            case 'card': return interaction.reply('🎨 La personalización de tarjetas de rango estará disponible próximamente.');

            // ================== MODERATION ==================
            case 'warn': {
                if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return errorReply('Necesitas el permiso `Gestionar Mensajes`.');
                const user = options.getUser('usuario');
                const razon = options.getString('razon') || 'Sin razón';
                const caseId = db.caseCounter++;
                db.cases[caseId] = { user: user.id, mod: interaction.user.id, reason: razon, type: 'Warn' };
                
                try { await user.send(`⚠️ Has sido advertido en **${guild.name}** por: ${razon}`); } catch {}
                return interaction.reply(`⚠️ **${user.tag}** ha sido advertido.\n📝 Razón: ${razon}\n🆔 Caso #${caseId}`);
            }
            case 'mute': {
                if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return errorReply('Necesitas el permiso `Gestionar Mensajes`.');
                const user = options.getUser('usuario');
                const mins = options.getInteger('minutos');
                const razon = options.getString('razon') || 'Sin razón';
                const targetMember = await guild.members.fetch(user.id).catch(() => null);
                if (!targetMember) return errorReply('Usuario no encontrado.');
                
                await targetMember.timeout(mins * 60 * 1000, razon);
                return interaction.reply(`🔇 **${user.tag}** ha sido silenciado por **${mins} minutos**.\n📝 Razón: ${razon}`);
            }
            case 'unmute': {
                if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return errorReply('Necesitas el permiso `Gestionar Mensajes`.');
                const user = options.getUser('usuario');
                const targetMember = await guild.members.fetch(user.id).catch(() => null);
                if (!targetMember) return errorReply('Usuario no encontrado.');
                
                await targetMember.timeout(null);
                return interaction.reply(`🔊 **${user.tag}** ya puede volver a comunicarse.`);
            }
            case 'kick': {
                if (!member.permissions.has(PermissionFlagsBits.KickMembers)) return errorReply('Necesitas el permiso `Expulsar Miembros`.');
                const user = options.getUser('usuario');
                const razon = options.getString('razon') || 'Sin razón';
                const targetMember = await guild.members.fetch(user.id).catch(() => null);
                if (!targetMember) return errorReply('Usuario no encontrado.');
                
                await targetMember.kick(razon);
                return interaction.reply(`👢 **${user.tag}** ha sido expulsado.\n📝 Razón: ${razon}`);
            }
            case 'ban': {
                if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return errorReply('Necesitas el permiso `Banear Miembros`.');
                const user = options.getUser('usuario');
                const razon = options.getString('razon') || 'Sin razón';
                const targetMember = await guild.members.fetch(user.id).catch(() => null);
                
                if (targetMember) await targetMember.ban({ reason: razon });
                else await guild.bans.create(user.id, { reason: razon });
                
                return interaction.reply(`🔨 **${user.tag}** ha sido baneado.\n📝 Razón: ${razon}`);
            }
            case 'unban': {
                if (!member.permissions.has(PermissionFlagsBits.BanMembers)) return errorReply('Necesitas el permiso `Banear Miembros`.');
                const userId = options.getString('usuario_id');
                await guild.bans.remove(userId).catch(() => { throw new Error('No se pudo encontrar el ban o el ID es inválido.'); });
                return interaction.reply(`✅ El usuario con ID **${userId}** ha sido desbaneado.`);
            }
            case 'purge': {
                if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return errorReply('Necesitas el permiso `Gestionar Mensajes`.');
                const amount = options.getInteger('cantidad');
                const messages = await channel.bulkDelete(amount + 1, true); // +1 para borrar el mensaje del comando
                return interaction.reply({ content: `🧹 ¡He borrado **${messages.size - 1}** mensajes!`, ephemeral: true });
            }
            case 'lock': {
                if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return errorReply('Necesitas el permiso `Gestionar Canales`.');
                await channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
                return interaction.reply('🔒 Este canal ha sido bloqueado. Nadie puede escribir excepto administradores.');
            }
            case 'unlock': {
                if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return errorReply('Necesitas el permiso `Gestionar Canales`.');
                await channel.permissionOverwrites.edit(guild.id, { SendMessages: null });
                return interaction.reply('🔓 Este canal ha sido desbloqueado. ¡Podéis volver a escribir!');
            }
            case 'slowmode': {
                if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return errorReply('Necesitas el permiso `Gestionar Mensajes`.');
                const seconds = options.getInteger('segundos') || 0;
                await channel.setRateLimitPerUser(seconds);
                if (seconds === 0) return interaction.reply('⏱️ El modo lento ha sido desactivado.');
                return interaction.reply(`⏱️ El modo lento se ha establecido en **${seconds} segundos**.`);
            }
            case 'case': {
                if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) return errorReply('Necesitas el permiso `Gestionar Mensajes`.');
                const caseId = options.getInteger('id_caso');
                const action = options.getString('accion');
                
                if (!db.cases[caseId]) return errorReply(`No se encontró el caso #${caseId}.`);
                
                if (action === 'view') {
                    const c = db.cases[caseId];
                    const embed = new EmbedBuilder()
                        .setTitle(`Caso #${caseId}`)
                        .setColor('Orange')
                        .addFields(
                            { name: 'Tipo', value: c.type, inline: true },
                            { name: 'Usuario', value: `<@${c.user}>`, inline: true },
                            { name: 'Moderador', value: `<@${c.mod}>`, inline: true },
                            { name: 'Razón', value: c.reason }
                        );
                    return interaction.reply({ embeds: [embed] });
                } else if (action === 'delete') {
                    delete db.cases[caseId];
                    return interaction.reply(`🗑️ El caso #${caseId} ha sido eliminado de los registros.`);
                }
            }
        }
    } catch (err) {
        console.error(err);
        if (interaction.replied || interaction.deferred) {
            interaction.followUp({ content: '❌ Ocurrió un error inesperado ejecutando el comando.', ephemeral: true });
        } else {
            interaction.reply({ content: '❌ Ocurrió un error inesperado ejecutando el comando.', ephemeral: true });
        }
    }
});

// Arrancar el bot
client.login(process.env.TOKEN);
