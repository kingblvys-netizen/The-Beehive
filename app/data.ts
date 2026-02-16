import { Server, Shield, Users, MessageCircle, Video, Camera, LucideIcon } from 'lucide-react';

// 1. Strict Interfaces
export interface Role {
  id: string;
  title: string;
  level: 'HIGH' | 'MID' | 'LOW';
  description: string;
  icon: LucideIcon;       
  commitment: string;     
}

export interface Question {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'radio';
  placeholder?: string;
  options?: string[];
}

// 2. Roles Configuration
export const roles: Role[] = [
  { 
    id: 'server-manager', 
    title: 'Server Manager', 
    level: 'HIGH', 
    description: 'Oversee infrastructure and manage high-level technical operations.',
    icon: Server,
    commitment: '25+ Hours / Week'
  },
  { 
    id: 'head-staff', 
    title: 'Head Staff', 
    level: 'HIGH', 
    description: 'Lead the moderation team and ensure high staff standards.',
    icon: Shield,
    commitment: '20+ Hours / Week'
  },
  { 
    id: 'staff-team', 
    title: 'Staff Team', 
    level: 'MID', 
    description: 'General server moderation, player support, and rule enforcement.',
    icon: Users,
    commitment: '10+ Hours / Week'
  },
  { 
    id: 'twitch-staff', 
    title: 'Twitch Staff', 
    level: 'MID', 
    description: 'Moderate live events and manage the streaming community chat atmosphere.',
    icon: MessageCircle,
    commitment: 'Event Based'
  },
  { 
    id: 'twitch-partner', 
    title: 'Twitch Partner', 
    level: 'LOW', 
    description: 'Elite role for verified Twitch Partners with high community reach.',
    icon: Video,
    commitment: 'Content Driven'
  },
  { 
    id: 'content-creator', 
    title: 'Content Creator', 
    level: 'LOW', 
    description: 'Rising YouTube and TikTok creators (2k+ followers/subs).',
    icon: Camera,
    commitment: 'Content Driven'
  }
];

// 3. Question Logic
export const getQuestions = (roleId: string | { id: string }): Question[] => {
  const searchKey = (typeof roleId === 'string' ? roleId : roleId?.id || '').toLowerCase().trim();

  const baseQuestions: Question[] = [
    { id: 'discord_user', label: 'Discord Username', type: 'text', placeholder: 'e.g. kingb' },
    { id: 'discord_id', label: 'Discord User ID', type: 'text', placeholder: 'e.g. 1208908529411301387' },
    
    // UPDATED: Age is now multiple choice ending in 21+
    { 
      id: 'age', 
      label: 'How old are you?', 
      type: 'radio', 
      options: ['13-15', '16-17', '18-20', '21+'] 
    },
    
    // UPDATED: Days Active is multiple choice
    { 
      id: 'days_active', 
      label: 'How many days of the week are you active or available?', 
      type: 'radio', 
      options: ['1-2 Days', '3-4 Days', '5-6 Days', 'Every Day'] 
    },
    
    { id: 'timezone', label: 'What is your timezone and most active hours?', type: 'text', placeholder: 'e.g. EST, 4 PM - 10 PM' }
  ];

  // Specific Role Logic
  if (searchKey === 'server-manager' || (searchKey.includes('manager') && !searchKey.includes('twitch'))) {
    return [
      ...baseQuestions,
      { id: 'sm_exp', label: 'Describe your previous experience managing or maintaining servers.', type: 'textarea' },
      { id: 'sm_style', label: 'What is your managing style and how does it benefit us?', type: 'textarea' },
      { id: 'sm_apply', label: 'How does your previous experience directly apply to this role?', type: 'textarea' },
      { id: 'sm_crash', label: 'Scenario: The server crashes during peak hours. Walk us through your response.', type: 'textarea' },
      { id: 'sm_prevent', label: 'What systems would you put in place to prevent downtime long-term?', type: 'textarea' }
    ];
  }

  if (searchKey === 'head-staff' || searchKey.includes('head')) {
    return [ 
      ...baseQuestions, 
      { id: 'hs_led', label: 'Describe your previous leadership experience.', type: 'textarea' }, 
      { id: 'hs_resp', label: 'What were your direct responsibilities as a leader?', type: 'textarea' }, 
      { id: 'hs_prep', label: 'How does your past experience prepare you for Head Staff here?', type: 'textarea' }, 
      { id: 'hs_argue', label: 'Scenario: Two moderators are publicly arguing. How do you resolve this?', type: 'textarea' }, 
      { id: 'hs_protocol', label: 'Scenario: A well-liked moderator ignores protocol. What steps do you take?', type: 'textarea' }, 
      { id: 'hs_burnout', label: 'How would you maintain staff motivation long-term?', type: 'textarea' }
    ];
  }

  if (searchKey === 'staff-team' || (searchKey.includes('staff') && !searchKey.includes('twitch') && !searchKey.includes('head'))) {
    return [ 
      ...baseQuestions, 
      { id: 'st_mod', label: 'Have you moderated before? If yes, where and for how long?', type: 'textarea' }, 
      { id: 'st_type', label: 'What types of situations did you handle most often?', type: 'textarea' }, 
      { id: 'st_apply', label: 'How does your previous moderation experience apply to this server?', type: 'textarea' }, 
      { id: 'st_cheat', label: 'Scenario: You suspect a popular member of cheating. What do you do?', type: 'textarea' }, 
      { id: 'st_insult', label: 'Scenario: A user starts insulting staff. How do you respond?', type: 'textarea' }
    ];
  }

  if (searchKey === 'twitch-staff' || (searchKey.includes('twitch') && searchKey.includes('staff'))) {
    return [ 
      ...baseQuestions, 
      { id: 'ts_mod', label: 'Have you moderated a Twitch stream? Describe the channel.', type: 'textarea' }, 
      { id: 'ts_stream', label: 'Have you streamed yourself? What did you learn?', type: 'textarea' }, 
      { id: 'ts_tools', label: 'What moderation tools or bots have you used?', type: 'textarea' }, 
      { id: 'ts_raid', label: 'Scenario: A hate raid floods chat. What immediate actions do you take?', type: 'textarea' }, 
      { id: 'ts_slur', label: 'Scenario: A long-time viewer uses a slur. How do you handle it?', type: 'textarea' }, 
      { id: 'ts_engage', label: 'How do you keep chat engaging while enforcing rules?', type: 'textarea' }
    ];
  }

  if (searchKey === 'content-creator' || searchKey.includes('creator')) {
    return [
      ...baseQuestions,
      { id: 'cc_activity', label: 'Have you uploaded or posted content in the last 6 months?', type: 'radio', options: ['Yes', 'No'] },
      { id: 'cc_stats', label: 'Subscriber/Follower Count (Requires 2k+)', type: 'text' },
      { id: 'cc_discord', label: 'Is your primary account linked to your Discord profile?', type: 'radio', options: ['Yes', 'No'] },
      { id: 'cc_style', label: 'Describe your content style.', type: 'textarea' },
      { id: 'cc_feature', label: 'How do you plan to showcase The Beehive in your content?', type: 'textarea' },
      { id: 'cc_promo', label: 'Are you willing to put the server IP in your bio?', type: 'radio', options: ['Yes', 'No'] },
      { id: 'cc_link', label: 'Provide a link to your primary channel.', type: 'text' }
    ];
  }

  if (searchKey === 'twitch-partner' || searchKey.includes('partner')) {
    return [
      ...baseQuestions,
      { id: 'tp_verified', label: 'Are you an officially Verified Twitch Partner?', type: 'radio', options: ['Yes', 'No'] },
      { id: 'tp_discord', label: 'Is your partnered account connected to this Discord?', type: 'radio', options: ['Yes', 'No'] },
      { id: 'tp_avg_views', label: 'What is your average concurrent viewership (CCV)?', type: 'text' },
      { id: 'tp_brand', label: 'How does The Beehive align with your professional brand?', type: 'textarea' },
      { id: 'tp_collab', label: 'Are you interested in exclusive partner events?', type: 'textarea' },
      { id: 'tp_req', label: 'What specific support do you expect from us?', type: 'textarea' },
      { id: 'tp_link', label: 'Provide your Twitch channel link.', type: 'text' }
    ];
  }

  return baseQuestions;
};