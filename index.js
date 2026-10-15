const http = require('http');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

// ===================================================
// SERVIDOR HTTP PARA MANTENER VIVO EL BOT EN RENDER
// ===================================================
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
client.login(CONFIG.TOKEN);
