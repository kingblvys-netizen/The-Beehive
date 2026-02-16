/* eslint-disable @typescript-eslint/no-require-imports */
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.once('ready', () => {
    console.log(`✅ Success! ${client.user.tag} is now online and monitoring The Beehive.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const command = message.content.toLowerCase();

    // Basic connection test
    if (command === '!test') {
        message.reply('🐝 **The Beehive Bot is active and listening!**');
    }

    // Professional status embed with live link
    if (command === '!status') {
        const statusEmbed = new EmbedBuilder()
            .setColor(0xFACC15) // Beehive Yellow
            .setTitle('🐝 Beehive System Status')
            .setDescription('Current recruitment portal information.')
            .addFields(
                { name: 'Portal Status', value: '🟢 **Online**', inline: true },
                { name: 'Environment', value: 'Development', inline: true },
                { name: 'Live Link', value: '[Open Careers Page](http://localhost:3000)' }
            )
            .setFooter({ text: 'The Beehive Recruitment System' })
            .setTimestamp();

        message.reply({ embeds: [statusEmbed] });
    }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
    console.error('❌ LOGIN FAILED: Check your .env.local token.');
    console.error(err.message);
});