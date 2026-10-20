const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  Collection,
  AttachmentBuilder
} = require('discord.js');

// ===================================================
// SERVIDOR HTTP PARA MANTENER VIVO EL BOT EN RENDER
// ===================================================
http.createServer((req, res) => {
  res.write("Bot ERCHI Mega-Bot activo 24/7 en Render");
  res.end();
}).listen(process.env.PORT || 3000);

// ===================================================
// CONFIGURACIÓN CENTRAL Y DE IDs
// ===================================================
const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  PREFIX: '!',
  
  CANAL_BIENVENIDA: '1552736136428785676',
  CANAL_LOGS: '1556299999999999999', // Canal donde se enviarán las transcripciones de tickets
  CANAL_ANUNCIOS: '1552736136428785676',
  CATEGORIA_TICKETS: '1552736493179764766',
  
  ROL_MIEMBRO: '155272955075211274',
  ROL_NUEVO_USUARIO: '1552732528698200224',
  ROL_STAFF: '1552729476721414215',
  
  ROL_STRIKE_1: '1556293453187383378',
  ROL_STRIKE_2: '1556293504454496266'
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites
  ]
});

// Colecciones y persistencia
const dbStrikes = new Map();
const dbNiveles = new Map();
const invitesCache = new Collection();

const PURCHASES_FILE = path.join(__dirname, 'purchases.json');
const KEYS_FILE = path.join(__dirname, 'keys.json');

const ROLE_TIERS = [
  { name: 'Cliente Exclusivo', minAmount: 10, id: '1553482235284431029' },
  { name: 'Cliente Especial',  minAmount: 20, id: '1553482359540809889' },
  { name: 'Cliente Premium',   minAmount: 30, id: '1553482458186514532' },
  { name: 'Cliente Elite',     minAmount: 50, id: '1553482861754187846' },
  { name: 'Cliente Black',     minAmount: 100, id: '1553482589501661288' }
];

const FAMOUS_CLIPS = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
  "https://www.youtube.com/watch?v=fJ9rUzIMcZQ"
];

function loadJson(file, defaultVal) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultVal, null, 2), 'utf-8');
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

async function processUserPurchase(guild, userId, purchaseAmount) {
  const purchases = loadJson(PURCHASES_FILE, {});
  const currentTotal = (purchases[userId] || 0) + purchaseAmount;
  purchases[userId] = currentTotal;
  saveJson(PURCHASES_FILE, purchases);

  try {
    const member = await guild.members.fetch(userId);
    if (!member) return;

    const rolesToAdd = ROLE_TIERS
      .filter(tier => currentTotal >= tier.minAmount)
      .map(tier => tier.id);

    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd);
    }
  } catch (error) {
    console.error(`Error asignando roles a ${userId}:`, error);
  }
}

async function sendLog(guild, title, description, color = '#3498db', attachment = null) {
  try {
    const canalLogs = guild.channels.cache.get(CONFIG.CANAL_LOGS);
    if (!canalLogs) return;
    const embedLog = new EmbedBuilder()
      .setTitle(`📋 LOGS: ${title}`)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();
    
    if (attachment) {
      canalLogs.send({ embeds: [embedLog], files: [attachment] });
    } else {
      canalLogs.send({ embeds: [embedLog] });
    }
  } catch (e) {
    console.error("Error en sendLog:", e);
  }
}

// ===================================================
// EVENTO: BOT LISTO, ESTADO DINÁMICO Y TAREAS PROGRAMADAS
// ===================================================
client.once('ready', async () => {
  console.log(`🤖 Mega-Bot ERCHI conectado como: ${client.user.tag}`);

  // Cachear invitaciones
  client.guilds.cache.forEach(async (guild) => {
    try {
      const firstInvites = await guild.invites.fetch();
      invitesCache.set(guild.id, new Collection(firstInvites.map((i) => [i.code, i.uses])));
    } catch (err) {}
  });

  // Estado dinámico
  setInterval(() => {
    const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const estados = [
      `🛒 ERCHI | OPTIMIZADOR`,
      `👥 ${totalMembers} Miembros en la comunidad`,
      `🔥 Usa !panel-comandos`,
      `💎 Revisa !panel-rangos`
    ];
    const randomEstado = estados[Math.floor(Math.random() * estados.length)];
    client.user.setActivity(randomEstado);
  }, 10000);

  // Anuncio automático cada 2 horas
  setInterval(() => {
    client.guilds.cache.forEach(guild => {
      const canal = guild.channels.cache.get(CONFIG.CANAL_ANUNCIOS);
      if (canal) {
        const embedAuto = new EmbedBuilder()
          .setTitle('⚡ ¡OPTIMIZA TU PC CON ERCHI!')
          .setDescription('¿Buscas los mejores FPS e Input Lag mínimo para tus juegos?\n' +
                          'Pásate por el canal de la **tienda** y adquiere tu licencia hoy mismo.')
          .setColor('#00FF00');
        canal.send({ embeds: [embedAuto] });
      }
    });
  }, 7200000); 
});

// ===================================================
// EVENTO: INVITE TRACKER Y BIENVENIDA
// ===================================================
client.on('guildMemberAdd', async (member) => {
  try {
    if (CONFIG.ROL_NUEVO_USUARIO) await member.roles.add(CONFIG.ROL_NUEVO_USUARIO);

    const newInvites = await member.guild.invites.fetch();
    const oldInvites = invitesCache.get(member.guild.id);
    const invite = newInvites.find((i) => i.uses > (oldInvites?.get(i.code) || 0));
    invitesCache.set(member.guild.id, new Collection(newInvites.map((i) => [i.code, i.uses])));

    const inviter = invite ? invite.inviter : null;
    const inviterText = inviter ? `Invitado/a por: **${inviter.tag}**` : 'Enlace directo';

    const canal = member.guild.channels.cache.get(CONFIG.CANAL_BIENVENIDA);
    if (canal) {
      const embed = new EmbedBuilder()
        .setTitle('¡Bienvenido/a al servidor! 👋')
        .setDescription(`Hola ${member}, bienvenido a **ERCHI | OPTIMIZADOR**.\n📌 ${inviterText}\n\nDirígete a verificación para acceder.`)
        .setColor('#00FF7F')
        .setTimestamp();
      canal.send({ embeds: [embed] });
    }
  } catch (error) {}
});

// ===================================================
// EVENTO: COMANDOS DEL SISTEMA
// ===================================================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Sistema XP
  const userId = message.author.id;
  let userData = dbNiveles.get(userId) || { xp: 0, nivel: 1 };
  userData.xp += Math.floor(Math.random() * 10) + 5;
  if (userData.xp >= userData.nivel * 100) {
    userData.nivel += 1;
    userData.xp = 0;
    message.channel.send(`🎉 ¡Felicidades ${message.author}! Subiste al **Nivel ${userData.nivel}**.`);
  }
  dbNiveles.set(userId, userData);

  if (!message.content.startsWith(CONFIG.PREFIX)) return;
  const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const esStaff = message.member.roles.cache.has(CONFIG.ROL_STAFF) || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

  // 1. PANEL DE COMANDOS (!panel-comandos)
  if (command === 'panel-comandos') {
    const embed = new EmbedBuilder()
      .setTitle('📜 PANEL DE COMANDOS - ERCHI-BOT (+50 Comandos)')
      .setDescription('Aquí tienes la lista completa de comandos organizados por categorías:\n\n' +
                      '🛒 **Tienda & Compras:**\n' +
                      '`!setup-tienda` - Despliega el panel de venta con Bizum, PayPal y Revolut.\n' +
                      '`!entregar @user <tipo> <precio>` - Entrega Key por MD y asigna rango VIP.\n' +
                      '`!panel-rangos` - Ver lista de gastos requeridos para cada rol VIP.\n' +
                      '`!stock` - Revisa el inventario de Keys activas.\n\n' +
                      '📢 **Anuncios & Difusión:**\n' +
                      '`!dmall <mensaje>` - Envía un comunicado por MD a todos los miembros.\n' +
                      '`!saycanal #canal <mensaje>` - Publica un mensaje en el canal deseado.\n' +
                      '`!directo <link>` - Notifica que estás en streaming.\n\n' +
                      '🎉 **Sorteos & Comunidad:**\n' +
                      '`!sorteo <minutos> <premio>` - Inicia un sorteo interactivo.\n' +
                      '`!rank` - Muestra tu nivel de XP actual.\n' +
                      '`!clip` - Muestra un clip o meme famoso.\n' +
                      '`!bump` - Promociona el servidor.\n\n' +
                      '🛡️ **Moderación & Staff:**\n' +
                      '`!panel-verificacion` | `!panel-tickets` | `!strike` | `!clear` | `!addrole` | `!removerole`')
      .setColor('#3498db')
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  }

  // 2. PANEL DE RANGOS Y CLIENTES VIP (!panel-rangos)
  if (command === 'panel-rangos') {
    const embed = new EmbedBuilder()
      .setTitle('💎 SISTEMA DE NIVELES Y RANGOS DE CLIENTE')
      .setDescription('En **ERCHI | OPTIMIZADOR** premiamos tu fidelidad. A medida que realizas compras en el servidor, tu gasto acumulado se registra automáticamente y te asigna rangos VIP exclusivos:\n\n' +
                      '🟢 **Cliente Exclusivo** ➔ **10€ acumulados**\n' +
                      '🔵 **Cliente Especial** ➔ **20€ acumulados**\n' +
                      '🟣 **Cliente Premium** ➔ **30€ acumulados**\n' +
                      '🟡 **Cliente Elite** ➔ **50€ acumulados**\n' +
                      '👑 **Cliente Black** ➔ **100€ acumulados**\n\n' +
                      '✨ *Los rangos otorgan soporte prioritario, canal privado de clientes y acceso anticipado a nuevas actualizaciones.*')
      .setColor('#FFD700')
      .setFooter({ text: 'El bot actualiza tus rangos al instante en cuanto recibes tu Key.' });
    message.channel.send({ embeds: [embed] });
  }

  // 3. BROADCAST MASIVO (!dmall <mensaje>)
  if (command === 'dmall') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const texto = args.join(' ');
    if (!texto) return message.reply('⚠️ Escribe el mensaje a enviar por DM.');

    message.reply('⏳ Enviando comunicado a todos los miembros por privado...');
    const miembros = await message.guild.members.fetch();
    miembros.forEach(async (m) => {
      if (!m.user.bot) {
        try {
          await m.send(`📢 **ANUNCIO OFICIAL DE ERCHI**:\n\n${texto}`);
        } catch (e) {}
      }
    });
    message.channel.send('✅ Proceso de envío completado.');
  }

  // 4. PUBLICAR EN CANAL ESPECÍFICO (!saycanal #canal <mensaje>)
  if (command === 'saycanal') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const canal = message.mentions.channels.first();
    const texto = args.slice(1).join(' ');
    if (!canal || !texto) return message.reply('⚠️ Uso: `!saycanal #canal <mensaje>`');
    canal.send(texto);
    message.reply(`✅ Mensaje publicado en ${canal}`);
  }

  // 5. CREAR SORTEO (!sorteo <minutos> <premio>)
  if (command === 'sorteo') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const minutos = parseInt(args[0]);
    const premio = args.slice(1).join(' ');
    if (isNaN(minutos) || !premio) return message.reply('⚠️ Uso: `!sorteo <minutos> <premio>`');

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ¡SORTEO EXPRESS: ${premio}!`)
      .setDescription(`Presiona 🎉 para entrar.\n⏱️ **Duración:** ${minutos} minuto(s)\n👤 **Organiza:** ${message.author}`)
      .setColor('#FFD700');

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_sorteo_join').setLabel('Participar 🎉').setStyle(ButtonStyle.Success)
    );

    const msgSorteo = await message.channel.send({ embeds: [embed], components: [btn] });
    const participantes = new Set();
    const collector = msgSorteo.createMessageComponentCollector({ time: minutos * 60000 });

    collector.on('collect', async (i) => {
      if (i.customId === 'btn_sorteo_join') {
        participantes.add(i.user.id);
        await i.reply({ content: '✅ Estás registrado en el sorteo.', ephemeral: true });
      }
    });

    collector.on('end', () => {
      const lista = Array.from(participantes);
      if (lista.length === 0) {
        message.channel.send(`😭 El sorteo de **${premio}** acabó sin participantes.`);
      } else {
        const ganadorId = lista[Math.floor(Math.random() * lista.length)];
        message.channel.send(`🎉 ¡ENHORABUENA <@${ganadorId}>! Has ganado **${premio}**.`);
      }
    });
  }

  // 6. GESTIÓN DE ROLES (!addrole / !removerole)
  if (command === 'addrole') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const user = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!user || !role) return message.reply('⚠️ Uso: `!addrole @usuario @rol`');
    await user.roles.add(role);
    message.reply(`✅ Rol **${role.name}** añadido a ${user}.`);
  }

  if (command === 'removerole') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const user = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!user || !role) return message.reply('⚠️ Uso: `!removerole @usuario @rol`');
    await user.roles.remove(role);
    message.reply(`✅ Rol **${role.name}** retirado de ${user}.`);
  }

  // 7. ENTRETENIMIENTO Y DIRECTOS
  if (command === 'clip') {
    const randomClip = FAMOUS_CLIPS[Math.floor(Math.random() * FAMOUS_CLIPS.length)];
    message.reply(`🎬 **Clip Famoso:**\n${randomClip}`);
  }

  if (command === 'directo') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const link = args[0];
    if (!link) return message.reply('⚠️ Añade el enlace del directo.');
    message.channel.send(`🟣 **¡ESTAMOS EN DIRECTO!** 🟣\n\nConéctate ya: ${link}\n@everyone`);
  }

  if (command === 'bump') {
    message.reply('🚀 ¡Gracias por impulsar el servidor!');
  }

  // 8. PANELES Y COMANDOS DE LA TIENDA
  if (command === 'setup-tienda') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const embedNormal = new EmbedBuilder().setTitle('⚡ ERCHI | OPTIMIZADOR - LICENCIA NORMAL (10€)').setDescription('• Limpieza de archivos temporales.\n• Desactivación de servicios innecesarios.\n• Optimización básica de FPS.').setColor('#3498db');
    const btnNormal = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('buy_normal').setLabel('💳 COMPRAR (10€)').setStyle(ButtonStyle.Primary));
    
    const embedPremium = new EmbedBuilder().setTitle('🔥 ERCHI | OPTIMIZADOR - LICENCIA PREMIUM (20€)').setDescription('• Todo lo de NORMAL.\n• Tweaks avanzados de Registro y Red.\n• Reducción de Input Lag.').setColor('#2ecc71');
    const btnPremium = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('buy_premium').setLabel('💳 COMPRAR (20€)').setStyle(ButtonStyle.Success));

    const embedUltra = new EmbedBuilder().setTitle('👑 ERCHI | OPTIMIZADOR - LICENCIA ULTRA (30€)').setDescription('• Todo lo de PREMIUM.\n• Bypass Creador y Soporte Prioritario 24/7.\n• Overclock y optimización extrema.').setColor('#e74c3c');
    const btnUltra = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('buy_ultra').setLabel('💳 COMPRAR (30€)').setStyle(ButtonStyle.Danger));

    await message.channel.send({ embeds: [embedNormal], components: [btnNormal] });
    await message.channel.send({ embeds: [embedPremium], components: [btnPremium] });
    await message.channel.send({ embeds: [embedUltra], components: [btnUltra] });
    if (message.deletable) message.delete();
  }

  if (command === 'panel-verificacion') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const embed = new EmbedBuilder().setTitle('🛡️ Verificación de Miembros').setDescription('Pulsa el botón inferior para verificarte.').setColor('#1E90FF');
    const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_verificar').setLabel('Verificarme').setStyle(ButtonStyle.Success));
    message.channel.send({ embeds: [embed], components: [btn] });
  }

  if (command === 'panel-tickets') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const embed = new EmbedBuilder().setTitle('📩 Soporte y Atenciones').setDescription('Abre un ticket si necesitas ayuda personalizada.').setColor('#FF8C00');
    const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_crear_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary));
    message.channel.send({ embeds: [embed], components: [btn] });
  }

  if (command === 'entregar') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const usuario = message.mentions.members.first();
    const tipo = args[1]?.toLowerCase();
    const precio = parseFloat(args[2]);
    if (!usuario || !tipo || isNaN(precio)) return message.reply('⚠️ Uso: `!entregar @usuario <normal|premium|ultra> <precio>`');

    let keysData = loadJson(KEYS_FILE, { normal: ["KEY-NORM-1"], premium: ["KEY-PREM-1"], ultra: ["KEY-ULTRA-1"] });
    if (!keysData[tipo] || keysData[tipo].length === 0) return message.reply(`❌ No hay Keys libres para **${tipo}**.`);

    const keyEntregada = keysData[tipo].shift();
    saveJson(KEYS_FILE, keysData);
    await processUserPurchase(message.guild, usuario.id, precio);

    try {
      const embedDM = new EmbedBuilder().setTitle('🎉 ¡Gracias por tu compra en ERCHI!').setDescription(`Tu licencia **${tipo.toUpperCase()}**:\n🔑 \`${keyEntregada}\``).setColor('#00FF00');
      await usuario.send({ embeds: [embedDM] });
      message.channel.send(`✅ Key enviada a ${usuario} por MD.`);
    } catch (e) {
      message.channel.send(`⚠️ Key: \`${keyEntregada}\` (MDs cerrados).`);
    }
  }

  if (command === 'rank') {
    const data = dbNiveles.get(userId) || { xp: 0, nivel: 1 };
    message.reply(`📊 **Nivel:** ${data.nivel} | **XP:** ${data.xp} / ${data.nivel * 100}`);
  }

  if (command === 'clear') {
    if (!esStaff) return message.reply('❌ No tienes permisos.');
    const cant = parseInt(args[0]);
    if (isNaN(cant)) return message.reply('⚠️ Especifica un número.');
    await message.channel.bulkDelete(cant, true).catch(() => {});
    message.channel.send(`🧹 Se han borrado ${cant} mensajes.`).then(m => setTimeout(() => m.delete(), 3000));
  }
});

// ===================================================
// EVENTO: INTERACCIONES Y CIERRE DE TICKETS CON TRANSCRIPCIÓN
// ===================================================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'btn_verificar') {
    if (CONFIG.ROL_NUEVO_USUARIO) await interaction.member.roles.remove(CONFIG.ROL_NUEVO_USUARIO).catch(() => {});
    if (CONFIG.ROL_MIEMBRO) await interaction.member.roles.add(CONFIG.ROL_MIEMBRO).catch(() => {});
    await interaction.reply({ content: '✅ Te has verificado correctamente.', ephemeral: true });
  }

  if (interaction.customId === 'btn_crear_ticket') {
    const canal = await interaction.guild.channels.create({
      name: `soporte-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CONFIG.CATEGORIA_TICKETS || null,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: CONFIG.ROL_STAFF, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });
    const embed = new EmbedBuilder().setTitle(`Ticket de ${interaction.user.username}`).setDescription('El Staff te atenderá enseguida.').setColor('#00FF00');
    const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_cerrar_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger));
    await canal.send({ content: `<@&${CONFIG.ROL_STAFF}>`, embeds: [embed], components: [btn] });
    await interaction.reply({ content: `✅ Ticket creado: ${canal}`, ephemeral: true });
  }

  // --- CIERRE DE TICKET CON GENERACIÓN AUTOMÁTICA DE TRANSCRIPCIÓN ---
  if (interaction.customId === 'btn_cerrar_ticket') {
    await interaction.reply('🔒 Generando transcripción completa y cerrando ticket en 5 segundos...');

    setTimeout(async () => {
      try {
        // Recopilar todos los mensajes del ticket
        const mensajes = await interaction.channel.messages.fetch({ limit: 100 });
        let transcripcionTexto = `==================================================\n` +
                                 `TRANSCRIPCIÓN OFICIAL DE TICKET - ERCHI OPTIMIZADOR\n` +
                                 `Canal: ${interaction.channel.name}\n` +
                                 `Cerrado por: ${interaction.user.tag} (${interaction.user.id})\n` +
                                 `Fecha: ${new Date().toLocaleString()}\n` +
                                 `==================================================\n\n`;

        const ordenados = Array.from(mensajes.values()).reverse();
        ordenados.forEach(msg => {
          transcripcionTexto += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
        });

        // Guardar archivo temporal
        const pathArchivo = path.join(__dirname, `transcript-${interaction.channel.name}.txt`);
        fs.writeFileSync(pathArchivo, transcripcionTexto, 'utf-8');

        // Adjuntar archivo y mandar al canal de LOGS
        const adjunto = new AttachmentBuilder(pathArchivo);
        await sendLog(
          interaction.guild,
          'Ticket Cerrado con Transcripción',
          `El ticket **${interaction.channel.name}** fue cerrado por ${interaction.user.tag}.\nAdjunto encontrarás el historial completo del chat en un archivo .txt.`,
          '#e74c3c',
          adjunto
        );

        // Borrar archivo temporal local
        if (fs.existsSync(pathArchivo)) fs.unlinkSync(pathArchivo);

        // Eliminar el canal en Discord
        await interaction.channel.delete();
      } catch (err) {
        console.error("Error generando transcripción:", err);
      }
    }, 5000);
  }

  if (interaction.customId.startsWith('buy_')) {
    let productType = interaction.customId.replace('buy_', '').toUpperCase();
    const canal = await interaction.guild.channels.create({
      name: `compra-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CONFIG.CATEGORIA_TICKETS || null,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: CONFIG.ROL_STAFF, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(`🛒 Compra - LICENCIA ${productType}`)
      .setDescription(`Hola ${interaction.user}, realiza tu pago por cualquiera de los medios:\n\n` +
                      `• **Bizum**: \`+34 TU_TELEFONO\`\n` +
                      `• **PayPal**: \`tu_correo_paypal@ejemplo.com\`\n` +
                      `• **Revolut**: \`@tu_revtag\`\n\n` +
                      `Sube la captura del pago a este ticket tras realizarlo.`)
      .setColor('#00FF00');

    const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_cerrar_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger));
    await canal.send({ content: `<@&${CONFIG.ROL_STAFF}>`, embeds: [embed], components: [btn] });
    await interaction.reply({ content: `✅ Ticket de compra abierto: ${canal}`, ephemeral: true });
  }
});

client.login(CONFIG.TOKEN);
