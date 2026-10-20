const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

const PREFIX = '!';

// Cargar o crear archivos JSON de datos
function cargarJSON(archivo, defecto = {}) {
    if (!fs.existsSync(archivo)) {
        fs.writeFileSync(archivo, JSON.stringify(defecto, null, 2));
        return defecto;
    }
    try {
        return JSON.parse(fs.readFileSync(archivo, 'utf8'));
    } catch {
        return defecto;
    }
}

function guardarJSON(archivo, datos) {
    fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
}

let keysDB = cargarJSON('keys.json', { NORMAL: [], PREMIUM: [], ULTRA: [] });
let purchasesDB = cargarJSON('purchases.json', {});
let xpDB = cargarJSON('xp.json', {});

client.once('ready', () => {
    console.log(`🤖 Bot conectado exitosamente como: ${client.user.tag}`);
    client.user.setActivity('!panel-comandos | Erchi Optimization', { type: 3 });
});

// Sistema de XP por mensaje
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // Sumar XP
    const userId = message.author.id;
    if (!xpDB[userId]) xpDB[userId] = { xp: 0, level: 1 };
    xpDB[userId].xp += Math.floor(Math.random() * 10) + 5;
    const nextLevel = xpDB[userId].level * 100;
    if (xpDB[userId].xp >= nextLevel) {
        xpDB[userId].level += 1;
        message.channel.send(`🎉 ¡Felicidades ${message.author}! Has subido al **Nivel ${xpDB[userId].level}**.`);
    }
    guardarJSON('xp.json', xpDB);

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- COMANDOS PRINCIPALES Y PANELES ---

    if (command === 'ping') {
        return message.reply(`🏓 **Pong!** Latencia: \`${client.ws.ping}ms\``);
    }

    if (command === 'panel-comandos') {
        const embed = new EmbedBuilder()
            .setTitle('📜 PANEL DE COMANDOS COMPLETO - ERCHI-BOT')
            .setColor('#5865F2')
            .setDescription('Aquí tienes la lista completa de comandos organizados:')
            .addFields(
                { name: '🛒 Tienda & Compras', value: '`!setup-tienda` | `!panel-rangos` | `!stock` | `!entregar @user <tipo> <precio>` | `!addkeys <tipo> <key>` | `!compras [@user]` | `!topclientes`', inline: false },
                { name: '🛡️ Moderación & Staff', value: '`!ban @user [razón]` | `!kick @user [razón]` | `!clear <1-100>` | `!strike @user [razón]` | `!strikes @user` | `!delstrike @user` | `!nuke`', inline: false },
                { name: '📩 Tickets & Verificación', value: '`!panel-tickets` | `!panel-verificacion` | `!claim` | `!close` | `!add @user` | `!remove @user`', inline: false },
                { name: '📢 Marketing & Difusión', value: '`!saycanal #canal <texto>` | `!embed #canal <título> | <texto>` | `!directo <link>` | `!dmall <texto>`', inline: false },
                { name: '🎮 Utilidades & Entretenimiento', value: '`!serverinfo` | `!userinfo [@user]` | `!avatar [@user]` | `!rank` | `!top` | `!8ball <pregunta>` | `!coinflip` | `!poll <pregunta>` | `!sorteo <minutos> <premio>`', inline: false }
            )
            .setFooter({ text: 'Erchi Optimization System' });
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'setup-tienda') {
        const embed = new EmbedBuilder()
            .setTitle('🛒 TIENDA OFICIAL - ERCHI OPTIMIZATION')
            .setDescription('Selecciona el plan de optimización que deseas adquirir pulsando en los botones de abajo.')
            .setColor('#2F3136')
            .addFields(
                { name: '🔵 Plan Normal - 10€', value: '• Optimización Básica de Windows\n• Reducción Input Lag ligero', inline: true },
                { name: '🟣 Plan Premium - 20€', value: '• Optimización Avanzada CPU/GPU\n• Tweak de Red y Registro', inline: true },
                { name: '🔴 Plan Ultra - 30€', value: '• Optimización Máxima FPS\n• Bios Tweaks + Soporte VIP 1 a 1', inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_normal').setLabel('Comprar Normal (10€)').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('buy_premium').setLabel('Comprar Premium (20€)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_ultra').setLabel('Comprar Ultra (30€)').setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (command === 'panel-rangos') {
        const embed = new EmbedBuilder()
            .setTitle('👑 RANGOS VIP Y BENEFICIOS DE CLIENTES')
            .setColor('#FEE75C')
            .setDescription('Cuanto más inviertes en nuestra tienda, más ventajas exclusivas desbloqueas:')
            .addFields(
                { name: '🥉 Cliente VIP - 10€+', value: 'Acceso a canales VIP y rol exclusivo.', inline: false },
                { name: '🥈 Cliente Élite - 30€+', value: 'Soporte prioritario y 5% de descuento en futuros servicios.', inline: false },
                { name: '🥇 Cliente Leyenda - 50€+', value: 'Acceso anticipado a herramientas privadas y 10% de descuento.', inline: false },
                { name: '💎 Cliente Supremo - 100€+', value: 'Atención personalizada directa por el CEO y soporte de por vida.', inline: false }
            );
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'panel-tickets') {
        const embed = new EmbedBuilder()
            .setTitle('📩 CENTRO DE SOPORTE Y ATENCIÓN')
            .setDescription('¿Necesitas ayuda con una compra o tienes dudas? Haz clic en el botón de abajo para abrir un ticket privado con el Staff.')
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('open_ticket').setLabel('📩 Abrir Ticket').setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    if (command === 'panel-verificacion') {
        const embed = new EmbedBuilder()
            .setTitle('✅ VERIFICACIÓN DE MIEMBROS')
            .setDescription('Haz clic en el botón verde de abajo para verificar tu cuenta y obtener acceso total al servidor.')
            .setColor('#57F287');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('verify_user').setLabel('✅ Verificarse').setStyle(ButtonStyle.Success)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }

    // --- GESTIÓN DE STOCK Y COMPRAS ---

    if (command === 'addkeys') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ No tienes permisos.');
        const tipo = args[0]?.toUpperCase();
        const key = args[1];
        if (!tipo || !key || !['NORMAL', 'PREMIUM', 'ULTRA'].includes(tipo)) {
            return message.reply('⚠️ Uso correcto: `!addkeys <NORMAL|PREMIUM|ULTRA> <clave-aqui>`');
        }
        keysDB[tipo].push(key);
        guardarJSON('keys.json', keysDB);
        return message.reply(`✅ Key **${key}** añadida con éxito a la categoría **${tipo}**.`);
    }

    if (command === 'stock') {
        const embed = new EmbedBuilder()
            .setTitle('📦 STOCK ACTUAL DE KEYS')
            .setColor('#3498DB')
            .addFields(
                { name: '🔵 Normal', value: `${keysDB.NORMAL.length} Keys disponibles`, inline: true },
                { name: '🟣 Premium', value: `${keysDB.PREMIUM.length} Keys disponibles`, inline: true },
                { name: '🔴 Ultra', value: `${keysDB.ULTRA.length} Keys disponibles`, inline: true }
            );
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'entregar') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ No tienes permisos.');
        const target = message.mentions.members.first();
        const tipo = args[1]?.toUpperCase();
        const precio = parseFloat(args[2]);

        if (!target || !tipo || isNaN(precio)) {
            return message.reply('⚠️ Uso correcto: `!entregar @usuario <NORMAL|PREMIUM|ULTRA> <precio>`');
        }

        if (!keysDB[tipo] || keysDB[tipo].length === 0) {
            return message.reply(`❌ No hay stock de Keys para la categoría **${tipo}**.`);
        }

        const keyEntregada = keysDB[tipo].shift();
        guardarJSON('keys.json', keysDB);

        // Actualizar compras
        if (!purchasesDB[target.id]) purchasesDB[target.id] = 0;
        purchasesDB[target.id] += precio;
        guardarJSON('purchases.json', purchasesDB);

        try {
            await target.send(`🎉 **¡Gracias por tu compra en Erchi Optimization!**\n\nAquí tienes tu clave para la versión **${tipo}**:\n\`\`\`${keyEntregada}\`\`\``);
            message.reply(`✅ Key entregada por privado a ${target} y acumulado **${purchasesDB[target.id]}€** de gasto.`);
        } catch {
            message.reply(`⚠️ No se pudo enviar por MD a ${target}. La Key era: \`${keyEntregada}\``);
        }
    }

    if (command === 'compras') {
        const target = message.mentions.members.first() || message.member;
        const total = purchasesDB[target.id] || 0;
        return message.reply(`💳 **${target.user.tag}** ha gastado un total acumulado de: **${total}€** en la tienda.`);
    }

    if (command === 'topclientes') {
        const sorted = Object.entries(purchasesDB).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (sorted.length === 0) return message.reply('📑 Aún no hay compras registradas.');
        
        let txt = '';
        for (let i = 0; i < sorted.length; i++) {
            txt += `**#${i + 1}** <@${sorted[i][0]}> — **${sorted[i][1]}€**\n`;
        }
        const embed = new EmbedBuilder().setTitle('🏆 TOP COMPRADORES DE ERCHI').setColor('#F1C40F').setDescription(txt);
        return message.channel.send({ embeds: [embed] });
    }

    // --- COMANDOS UTILIDAD Y ENTRETENIMIENTO ---

    if (command === 'serverinfo') {
        const embed = new EmbedBuilder()
            .setTitle(`📊 Información de ${message.guild.name}`)
            .setColor('#9B59B6')
            .setThumbnail(message.guild.iconURL())
            .addFields(
                { name: '👑 Creador / Dueño', value: `<@${message.guild.ownerId}>`, inline: true },
                { name: '👥 Miembros Totales', value: `${message.guild.memberCount}`, inline: true },
                { name: '📅 Fecha de Creación', value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>`, inline: true }
            );
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'userinfo') {
        const target = message.mentions.members.first() || message.member;
        const embed = new EmbedBuilder()
            .setTitle(`👤 Información de ${target.user.tag}`)
            .setThumbnail(target.user.displayAvatarURL())
            .setColor('#3498DB')
            .addFields(
                { name: '🆔 ID', value: target.id, inline: true },
                { name: '📅 Ingreso al Servidor', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 Roles', value: target.roles.cache.map(r => r).join(' ') || 'Ninguno', inline: false }
            );
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'avatar') {
        const target = message.mentions.users.first() || message.author;
        const embed = new EmbedBuilder()
            .setTitle(`🖼️ Avatar de ${target.tag}`)
            .setImage(target.displayAvatarURL({ size: 1024, dynamic: true }))
            .setColor('#E91E63');
        return message.channel.send({ embeds: [embed] });
    }

    if (command === 'rank') {
        const data = xpDB[message.author.id] || { xp: 0, level: 1 };
        return message.reply(`⭐ **Nivel actual:** ${data.level} | **XP:** ${data.xp}/${data.level * 100}`);
    }

    if (command === 'top') {
        const sorted = Object.entries(xpDB).sort((a, b) => b[1].xp - a[1].xp).slice(0, 5);
        let txt = '';
        sorted.forEach((item, index) => {
            txt += `**#${index + 1}** <@${item[0]}> - Nivel ${item[1].level} (${item[1].xp} XP)\n`;
        });
        const embed = new EmbedBuilder().setTitle('🏆 TOP NIVELES DEL SERVIDOR').setColor('#E74C3C').setDescription(txt || 'Sin datos');
        return message.channel.send({ embeds: [embed] });
    }

    if (command === '8ball') {
        const pregunta = args.join(' ');
        if (!pregunta) return message.reply('⚠️ Por favor escribe una pregunta. Ejemplo: `!8ball ¿Saldrá todo bien?`');
        const respuestas = ['Sí, definitivamente.', 'No lo creo.', 'Es muy probable.', 'No cuentes con ello.', 'Pregunta de nuevo más tarde.', '100% Seguro.'];
        const res = respuestas[Math.floor(Math.random() * respuestas.length)];
        return message.reply(`🎱 **Pregunta:** ${pregunta}\n✨ **Respuesta:** ${res}`);
    }

    if (command === 'coinflip') {
        const resultado = Math.random() < 0.5 ? '🪙 **¡Cara!**' : '🪙 **¡Cruz!**';
        return message.reply(resultado);
    }

    if (command === 'poll') {
        const pregunta = args.join(' ');
        if (!pregunta) return message.reply('⚠️ Uso: `!poll <tu pregunta aquí>`');
        const embed = new EmbedBuilder().setTitle('📊 ENCUESTA RÁPIDA').setDescription(pregunta).setColor('#F1C40F').setFooter({ text: `Creada por ${message.author.tag}` });
        const pollMsg = await message.channel.send({ embeds: [embed] });
        await pollMsg.react('👍');
        await pollMsg.react('👎');
    }

    // --- COMANDOS DE MODERACIÓN Y STAFF ---

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ No tienes permiso para banear.');
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'Sin razón especificada';
        if (!target) return message.reply('⚠️ Uso correcto: `!ban @usuario razón` (sin paréntesis ni corchetes)');
        await target.ban({ reason });
        return message.reply(`⛔ **${target.user.tag}** ha sido baneado. Razón: ${reason}`);
    }

    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ No tienes permiso.');
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('⚠️ Indica un número del 1 al 100. Ejemplo: `!clear 10`');
        await message.channel.bulkDelete(amount, true);
        const msg = await message.channel.send(`🧹 Se han borrado **${amount}** mensajes.`);
        setTimeout(() => msg.delete().catch(() => {}), 3000);
    }

    if (command === 'nuke') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Solo Administradores.');
        const pos = message.channel.position;
        const newChannel = await message.channel.clone();
        await message.channel.delete();
        await newChannel.setPosition(pos);
        return newChannel.send('💥 **¡Canal rehecho por completo! (Nuke)**');
    }
});

// --- INTERACCIONES CON BOTONES Y TICKETS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('buy_')) {
        const plan = interaction.customId.replace('buy_', '').toUpperCase();
        return interaction.reply({ content: `💳 Has seleccionado comprar el plan **${plan}**. Contacta con un Staff o usa los canales oficiales de Bizum/PayPal/Revolut para completar el pago.`, ephemeral: true });
    }

    if (interaction.customId === 'verify_user') {
        return interaction.reply({ content: '✅ ¡Te has verificado correctamente en el servidor!', ephemeral: true });
    }

    if (interaction.customId === 'open_ticket') {
        const ch = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`📩 Ticket de ${interaction.user.username}`)
            .setDescription('Describe detalladamente tu duda o problema. Un miembro del Staff te atenderá enseguida.')
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Cerrar Ticket').setStyle(ButtonStyle.Danger)
        );

        await ch.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
        return interaction.reply({ content: `✅ Ticket creado en ${ch}`, ephemeral: true });
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply('🔒 El ticket se cerrará y guardará en 5 segundos...');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);
