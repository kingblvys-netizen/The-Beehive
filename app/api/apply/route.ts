import { NextResponse } from 'next/server';
import { getQuestions } from '../../data';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roleTitle, username, answers } = body;

    const roleQuestions = getQuestions(roleTitle);

    // Extract specific Discord info for the header fields
    const discordUser = answers['discord_user'] || username || "Unknown";
    const discordID = answers['discord_id'] || "Not Provided";

    // Filter out the header info from the main description to avoid repetition
    const formattedAnswers = Object.entries(answers)
      .filter(([id]) => id !== 'discord_user' && id !== 'discord_id')
      .map(([id, value]) => {
        const questionObj = roleQuestions.find(q => q.id === id);
        const questionLabel = questionObj ? questionObj.label : id.toUpperCase().replace(/_/g, ' ');
        return `**${questionLabel}**\n${value}`;
      })
      .join('\n\n');

    const discordPayload = {
      username: "Beehive Recruitment",
      avatar_url: "https://i.imgur.com/8N4N5iH.png",
      embeds: [{
        title: `🐝 New Application: ${roleTitle}`,
        color: 0xFACC15, 
        fields: [
          { name: "Discord User", value: discordUser, inline: true },
          { name: "Discord ID", value: discordID, inline: true },
          { name: "Position", value: roleTitle, inline: true },
        ],
        description: `**User Responses:**\n\n${formattedAnswers}`,
        footer: { text: "The Beehive Careers • Identity Verified" },
        timestamp: new Date().toISOString(),
      }],
    };

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) return NextResponse.json({ message: 'Webhook failed' }, { status: 500 });

    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}