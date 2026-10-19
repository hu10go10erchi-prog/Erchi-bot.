const http = require('http');

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

// ==========================================
// SERVIDOR HTTP PARA MANTENER VIVO EL BOT EN RENDER
// ==========================================
http.createServer((req, res) => {
    res.write("Bot ERCHI activo 24/7 en Render");
    res.end();
}).listen(process.env.PORT || 3000);

// ===================================================
// CONFIGURACIÓN CENTRAL DE IDs
// ===================================================
const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  PREFIX: '!',
  
  CANAL_BIENVENIDA: '1552736136428785676',
  CATEGORIA_TICKETS: '1552736493179764766',
  
  ROL_MIEMBRO: '1552729555075211274',       // ID Corregido
  ROL_NUEVO_USUARIO: '1552732528698200224',  // Rol No Verificado
  ROL_STAFF: '1552729476721414215',
  
  ROL_STRIKE_1: '1556293453187383378',
  ROL_STRIKE_2: '1556293504454496266'
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Bases de datos temporales
const dbStrikes = new Map();
const dbNiveles = new Map();

// ==========================================
// MANEJADOR DE LOS BOTONES DE COMPRA
// ==========================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('buy_')) {
        const productType = interaction.customId.replace('buy_', '').toUpperCase();
        
        // Crear canal de ticket de compra privado
        try {
            const canalTicket = await interaction.guild.channels.create({
                name: `compra-${productType.toLowerCase()}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CONFIG.CATEGORIA_TICKETS,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: CONFIG.ROL_STAFF, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            const embedCompra = new EmbedBuilder()
                .setTitle(`🛒 Solicitud de Compra - LICENCIA ${productType}`)
                .setDescription(`¡Hola ${interaction.user}! Gracias por tu interés en **ERCHI | OPTIMIZADOR**.\n\n` +
                                `Por favor, realiza el pago correspondiente y adjunta la captura en este ticket:\n` +
                                `• **PayPal**: tu_paypal@ejemplo.com\n` +
                                `• **Bizum**: +34 600 000 000\n\n` +
                                `Un Administrador verificará el pago para activarte la Key y tus roles automáticamente.`)
                .setColor('#00FF00');

            const btnCerrar = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_cerrar_ticket')
                    .setLabel('Cerrar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await canalTicket.send({ content: `<@${interaction.user.id}> <@&${CONFIG.ROL_STAFF}>`, embeds: [embedCompra], components: [btnCerrar] });
            await interaction.reply({ content: `✅ Ticket de compra creado con éxito: ${canalTicket}`, ephemeral: true });

        } catch (error) {
            console.error('Error al crear ticket de compra:', error);
            await interaction.reply({ content: '❌ Hubo un error al intentar crear tu ticket de compra.', ephemeral: true });
        }
    }
});
// ===================================================
// EVENTO: BOT LISTO
// ===================================================
client.once('ready', () => {
  console.log(`🤖 Bot conectado exitosamente como: ${client.user.tag}`);
});

// ===================================================
// EVENTO: BIENVENIDA AUTOMÁTICA
// ===================================================
client.on('guildMemberAdd', async (member) => {
  try {
    if (CONFIG.ROL_NUEVO_USUARIO) {
      await member.roles.add(CONFIG.ROL_NUEVO_USUARIO);
    }
    const canal = member.guild.channels.cache.get(CONFIG.CANAL_BIENVENIDA);
    if (canal) {
      const embed = new EmbedBuilder()
        .setTitle('¡Bienvenido/a al servidor! 👋')
        .setDescription(`Hola ${member}, por favor dirígete al canal de verificación para obtener acceso total.`)
        .setColor('#00FF7F')
        .setTimestamp();
      canal.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Error en evento bienvenida:', error);
  }
});

// ===================================================
// EVENTO: COMANDOS Y SISTEMA DE NIVELES (XP)
// ===================================================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // --- Sistema de Niveles (XP) ---
  const userId = message.author.id;
  let userData = dbNiveles.get(userId) || { xp: 0, nivel: 1 };
  userData.xp += Math.floor(Math.random() * 10) + 5;
  
  const xpNecesaria = userData.nivel * 100;
  if (userData.xp >= xpNecesaria) {
    userData.nivel += 1;
    userData.xp = 0;
    message.channel.send(`🎉 ¡Felicidades ${message.author}! Has subido al **Nivel ${userData.nivel}**.`);
  }
  dbNiveles.set(userId, userData);

  // --- Comandos con Prefijo ---
  if (!message.content.startsWith(CONFIG.PREFIX)) return;
  const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const esStaff = message.member.roles.cache.has(CONFIG.ROL_STAFF) || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

  // COMANDO: !panel-verificacion (Staff)
  if (command === 'panel-verificacion') {
    if (!esStaff) return message.reply('❌ No tienes permisos de Staff para usar este comando.');
    
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Verificación de Miembros')
      .setDescription('Haz clic en el botón de abajo para verificar tu cuenta y acceder al resto de canales.')
      .setColor('#1E90FF');

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_verificar')
        .setLabel('Verificarme')
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [btn] });
  }

  // COMANDO: !panel-tickets (Staff)
  if (command === 'panel-tickets') {
    if (!esStaff) return message.reply('❌ No tienes permisos de Staff para usar este comando.');

    const embed = new EmbedBuilder()
      .setTitle('📩 Soporte y Atenciones')
      .setDescription('Si necesitas ayuda o realizar una consulta al Staff, abre un ticket presionando el botón.')
      .setColor('#FF8C00');

    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_crear_ticket')
        .setLabel('Abrir Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [btn] });
  }

  // COMANDO: !rank
  if (command === 'rank') {
    const data = dbNiveles.get(userId) || { xp: 0, nivel: 1 };
    const embed = new EmbedBuilder()
      .setTitle(`📊 Nivel de ${message.author.username}`)
      .addFields(
        { name: 'Nivel', value: `${data.nivel}`, inline: true },
        { name: 'XP Actual', value: `${data.xp} / ${data.nivel * 100}`, inline: true }
      )
      .setColor('#9370DB');
    message.reply({ embeds: [embed] });
  }

  // COMANDO: !strike (Staff)
  if (command === 'strike') {
    if (!esStaff) return message.reply('❌ No tienes permisos de Staff para sancionar.');

    const usuario = message.mentions.members.first();
    if (!usuario) return message.reply('⚠️ Debes mencionar a un usuario. Ejemplo: `!strike @usuario`');

    let strikesActuales = (dbStrikes.get(usuario.id) || 0) + 1;
    dbStrikes.set(usuario.id, strikesActuales);

    if (strikesActuales === 1) {
      await usuario.roles.add(CONFIG.ROL_STRIKE_1);
      message.channel.send(`⚠️ ${usuario} ha recibido su **Strike 1**.`);
    } else if (strikesActuales === 2) {
      await usuario.roles.add(CONFIG.ROL_STRIKE_2);
      message.channel.send(`⚠️ ${usuario} ha recibido su **Strike 2**.`);
    } else if (strikesActuales >= 3) {
      message.channel.send(`🚫 ${usuario} ha alcanzado 3 strikes. Procediendo a sanción definitiva.`);
      await usuario.timeout(60 * 60 * 1000, 'Límite de 3 strikes alcanzado');
    }
  }
});

// ===================================================
// EVENTO: BOTONES E INTERACCIONES
// ===================================================
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    
    // --- Botón de Verificación ---
    if (interaction.customId === 'btn_verificar') {
      try {
        const member = interaction.member;

        // 1. Asignar rol de miembro
        if (CONFIG.ROL_MIEMBRO) {
          await member.roles.add(CONFIG.ROL_MIEMBRO);
        }

        // 2. Retirar rol no verificado si lo posee
        if (CONFIG.ROL_NUEVO_USUARIO && member.roles.cache.has(CONFIG.ROL_NUEVO_USUARIO)) {
          await member.roles.remove(CONFIG.ROL_NUEVO_USUARIO);
        }

        await interaction.reply({ content: '✅ Te has verificado correctamente.', ephemeral: true });
      } catch (err) {
        console.error('Error al verificar:', err);
        await interaction.reply({ 
          content: `❌ Error al asignar roles: ${err.message}`, 
          ephemeral: true 
        });
      }
    }

    // --- Botón Crear Ticket ---
    if (interaction.customId === 'btn_crear_ticket') {
      try {
        const canalTicket = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: CONFIG.CATEGORIA_TICKETS || null,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: CONFIG.ROL_STAFF, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
          ]
        });

        const embed = new EmbedBuilder()
          .setTitle(`Ticket de ${interaction.user.username}`)
          .setDescription('Describe tu consulta aquí. El equipo de Staff te atenderá pronto.')
          .setColor('#00FF00');

        const btnCerrar = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('btn_cerrar_ticket')
            .setLabel('Cerrar Ticket')
            .setStyle(ButtonStyle.Danger)
        );

        await canalTicket.send({ content: `<@&${CONFIG.ROL_STAFF}>`, embeds: [embed], components: [btnCerrar] });
        await interaction.reply({ content: `✅ Ticket creado: ${canalTicket}`, ephemeral: true });
      } catch (err) {
        console.error('Error al crear ticket:', err);
        await interaction.reply({ content: '❌ No se pudo crear el canal de ticket.', ephemeral: true });
      }
    }

    // --- Botón Cerrar Ticket ---
    if (interaction.customId === 'btn_cerrar_ticket') {
      await interaction.reply('🔒 El ticket se cerrará en 5 segundos...');
      setTimeout(() => interaction.channel.delete(), 5000);
    }
  }
});

// ===================================================
// INICIO DE SESIÓN
// ===================================================


// ==========================================
// 1. MÓDULO DE CLIENTES Y ROLES ACUMULATIVOS
// ==========================================
const fs = require('fs');
const path = require('path');

const PURCHASES_FILE = path.join(__dirname, 'purchases.json');

const ROLE_TIERS = [
    { name: 'Cliente Exclusivo', minAmount: 10, id: '1553482235284431029' },
    { name: 'Cliente Especial',  minAmount: 20, id: '1553482359540809889' },
    { name: 'Cliente Premium',   minAmount: 30, id: '1553482458186514532' },
    { name: 'Cliente Elite',     minAmount: 50, id: '1553482861754187846' },
    { name: 'Cliente Black',     minAmount: 100, id: '1553482589501661288' }
];

function loadPurchases() {
    if (!fs.existsSync(PURCHASES_FILE)) {
        fs.writeFileSync(PURCHASES_FILE, JSON.stringify({}), 'utf-8');
    }
    return JSON.parse(fs.readFileSync(PURCHASES_FILE, 'utf-8'));
}

function savePurchases(data) {
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function processUserPurchase(guild, userId, purchaseAmount) {
    const purchases = loadPurchases();
    const currentTotal = (purchases[userId] || 0) + purchaseAmount;
    purchases[userId] = currentTotal;
    savePurchases(purchases);

    try {
        const member = await guild.members.fetch(userId);
        if (!member) return;

        const rolesToAdd = ROLE_TIERS
            .filter(tier => currentTotal >= tier.minAmount)
            .map(tier => tier.id);

        if (rolesToAdd.length > 0) {
            await member.roles.add(rolesToAdd);
            console.log(`[ÉXITO] Roles asignados a ${member.user.tag}. Total acumulado: ${currentTotal}€`);
        }
    } catch (error) {
        console.error(`Error asignando roles a ${userId}:`, error);
    }
}

// ==========================================
// 2. COMANDO PARA PUBLICAR LA TIENDA (!setup-tienda)
// ==========================================
client.on('messageCreate', async message => {
    if (message.content === '!setup-tienda' && message.member.permissions.has('Administrator')) {
        
        const embedNormal = new EmbedBuilder()
            .setTitle('⚡ ERCHI | OPTIMIZADOR - LICENCIA NORMAL (10€)')
            .setDescription('La solución ideal para mejorar el rendimiento básico de tu PC.\n\n' +
                            '• Limpieza profunda de archivos temporales.\n' +
                            '• Desactivación de servicios innecesarios de Windows.\n' +
                            '• Optimización básica de FPS en juegos.')
            .setColor('#3498db');

        const btnNormal = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('buy_normal')
                .setLabel('💳 COMPRAR KEY (10€)')
                .setStyle(ButtonStyle.Primary)
        );

        const embedPremium = new EmbedBuilder()
            .setTitle('🔥 ERCHI | OPTIMIZADOR - LICENCIA PREMIUM (20€)')
            .setDescription('Máximo equilibrio entre rendimiento y optimización del sistema.\n\n' +
                            '• Todo lo incluido en la versión NORMAL.\n' +
                            '• Tweaks avanzados de Registro de Windows y Red.\n' +
                            '• Reducción del Input Lag en periféricos.')
            .setColor('#2ecc71');

        const btnPremium = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('buy_premium')
                .setLabel('💳 COMPRAR KEY (20€)')
                .setStyle(ButtonStyle.Success)
        );

        const embedUltra = new EmbedBuilder()
            .setTitle('👑 ERCHI | OPTIMIZADOR - LICENCIA ULTRA (30€)')
            .setDescription('El paquete definitivo de rendimiento sin limitaciones.\n\n' +
                            '• Todo lo incluido en la versión PREMIUM.\n' +
                            '• Acceso al Bypass Creador y soporte prioritario 24/7.\n' +
                            '• Perfiles de overclock y optimizaciones extremas.')
            .setColor('#e74c3c');

        const btnUltra = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('buy_ultra')
                .setLabel('💳 COMPRAR KEY (30€)')
                .setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embedNormal], components: [btnNormal] });
        await message.channel.send({ embeds: [embedPremium], components: [btnPremium] });
        await message.channel.send({ embeds: [embedUltra], components: [btnUltra] });

     message.delete();
    }
});

// ==========================================
// ¡EL LOGIN SIEMPRE AL FINAL ABSOLUTO!
// ==========================================
client.login(process.env.DISCORD_TOKEN);
