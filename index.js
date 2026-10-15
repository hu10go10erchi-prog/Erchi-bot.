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
// CONFIGURACIÓN CENTRAL Y DE IDs
// ===================================================
const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  PREFIX: '!',
  
  CANAL_BIENVENIDA: '1552736136428785676',
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
    GatewayIntentBits.MessageContent
  ]
});

// Bases de datos en memoria
const dbStrikes = new Map();
const dbNiveles = new Map();

// ===================================================
// EVENTO: BOT LISTO
// ===================================================
client.once('ready', () => {
  console.log(`🤖 Bot conectado exitosamente como: ${client.user.tag}`);
});

// ===================================================
// EVENTO: BIENVENIDA Y ROLES
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
        .