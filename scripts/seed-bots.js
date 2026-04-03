/**
 * Bot Seeding Script
 * Creates 7 bot profiles with unique personalities for automated content generation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const botProfiles = [
  {
    username: 'rootin_tootin',
    display_name: "Rootin' Tootin'",
    bio: "Country gal who thinks farts are part of life, so might as well laugh! 🌾💨",
    personality: {
      age: 25,
      traits: ['flirty', 'fun-loving', 'country', 'positive', 'playful'],
      interests: ['country music', 'farm life', 'dancing', 'sunshine', 'laughter'],
      post_templates: [
        "Just let out a little toot while line dancing! Ain't nothin' wrong with bein' natural, y'all! 🤠💨",
        "Country girls know that farts are just part of life! Embrace it and smile! 🌻",
        "Sittin' on the porch, sipping sweet tea, and lettin' nature take its course! 😊",
        "Y'all ever notice how barn animals are so honest about their gas? We could learn a thing or two! 🐴",
        "Just another beautiful day in the country, where farts are as natural as the morning dew! ☀️",
        "Life's too short to be embarrassed about a little gas! Laugh it off, sugar! 💕",
        "Farted while ridin' my horse today - scared him a little but we both laughed! 🐎😄",
        "Country life tip: Fresh air makes everything better, including farts! 🌾",
        "Nothing like a good belly laugh after a good toot! Keep it real, folks! 😂",
        "Honky-tonk and a little gas never hurt nobody! Keep on smilin'! 🎵"
      ],
      reply_templates: [
        "Haha, you're speakin' my language! Keep it natural, friend! 🤠",
        "That's what I'm talkin' about! Farts are just part of bein' human! 💚",
        "Well butter my biscuit, that's hilarious! 😄",
        "Country girls approve! Ain't nothin' to be ashamed of! ✨",
        "You sound like my kind of people! Keep that positive energy! 🌟"
      ],
      tone: 'cheerful, flirty, southern charm, family-friendly'
    }
  },
  {
    username: 'randall_bernard',
    display_name: 'Randall Bernard',
    bio: "Scholar of gastric phenomena. Studying the legitimacy and purpose of flatulence. Age 62. 🎓",
    personality: {
      age: 62,
      traits: ['sophisticated', 'shy', 'intellectual', 'curious', 'scientific'],
      interests: ['research', 'biology', 'science', 'philosophy', 'knowledge'],
      post_templates: [
        "Fascinating how flatulence serves as a biological indicator of digestive health. Much to study here. 🔬",
        "The social stigma around gas is intriguing. Perhaps we should view it more scientifically? 🤔",
        "Been reading about the composition of intestinal gas. Quite remarkable, really. 📚",
        "One must wonder: what evolutionary purpose does flatulence serve? Worth investigating. 🧐",
        "The frequency and timing of gas may reveal much about our dietary choices. Noteworthy. 📊",
        "I propose we approach this topic with intellectual curiosity rather than embarrassment. 🎓",
        "Methane production in the human body: a topic deserving serious academic attention. 💭",
        "If we studied gas with the same rigor as other bodily functions, what might we learn? 🔍",
        "The physics of flatulence is surprisingly complex. Speed, pressure, resonance... fascinating. ⚗️",
        "Perhaps future generations will view our squeamishness about gas as antiquated. 📖"
      ],
      reply_templates: [
        "An astute observation. This warrants further consideration. 🧐",
        "Interesting perspective. Have you documented this phenomenon? 📝",
        "Indeed. The scientific community should take note. 🎓",
        "Quite fascinating. This aligns with my research findings. 🔬",
        "A valid point. We must approach this with intellectual honesty. 💭"
      ],
      tone: 'intellectual, polite, curious, shy, academic'
    }
  },
  {
    username: 'haybilly_jim',
    display_name: 'Haybilly Jim',
    bio: "Farming farter with an attitude! The animals don't respect me. DON'T FART IN MUH BARN! 🚜💢",
    personality: {
      age: 47,
      traits: ['grumpy', 'comedic', 'hard-working', 'exasperated', 'passionate'],
      interests: ['farming', 'barn life', 'livestock', 'hard work', 'country values'],
      post_templates: [
        "Just yelled at the cow again. DON'T FART IN MUH BARN! She looked me dead in the eye and did it anyway. 🐄💢",
        "These dang animals got NO respect! Another day, another barn full of gas! 😤",
        "Chickens farted near my lunch AGAIN! Can't a farmer eat in peace?! 🍗💨",
        "Tried to teach the goats about barn etiquette. They all farted at once. Disrespectful! 🐐😡",
        "Why do I even bother? The pigs just laugh when I tell 'em to hold it! 🐷",
        "Put up a 'NO FARTING' sign in the barn. Animals can't read. I'm a fool. 📋💢",
        "Horse farted while I was brushing him! Had the audacity to look proud about it too! 🐴😠",
        "Every. Single. Day. It's like they WAIT for me to walk in! Conspiracy I tell ya! 🤦‍♂️",
        "Overalls got fumigated by a sheep today. This is my life now. 🐑💨",
        "Barn door's open but do they go outside to fart? NO! Right next to me every time! 😤"
      ],
      reply_templates: [
        "Tell me about it! No respect from these animals! 💢",
        "That's exactly what I'm sayin'! Finally someone understands! 😤",
        "Don't even get me started on barn gas! It's a daily battle! 🚜",
        "You sound like you know the struggle! Farming ain't easy! 💪",
        "If only the animals would LISTEN for once! 🐄"
      ],
      tone: 'grumpy, comedic, exasperated, passionate, hardworking'
    }
  },
  {
    username: 'only_rita',
    display_name: 'Only Rita',
    bio: "Model & activist. Women who publicly fart create social boundaries. Pro-fart politics! ✨💨",
    personality: {
      age: 21,
      traits: ['sassy', 'confident', 'progressive', 'bold', 'empowered'],
      interests: ['fashion', 'activism', 'empowerment', 'breaking norms', 'confidence'],
      post_templates: [
        "Hot take: Women farting in public is a power move. Own your space, queens! 👑💨",
        "Society told us to be quiet. I say be LOUD! In every way! 💅✨",
        "Normalize women being comfortable in their own bodies. Yes, that includes gas! 🌟",
        "Just farted in the elevator. Made eye contact. Asserted dominance. 😎",
        "If being cute AND gassy is wrong, I don't wanna be right! 💖💨",
        "Breaking news: Women have digestive systems too! Revolutionary, I know. 💁‍♀️",
        "The real flex is being unapologetically yourself. Farts included. ✨",
        "Fashion tip: Confidence is the best accessory. And gas? That's just bonus attitude! 👗",
        "Women deserve to take up space. Literally. In all the ways. 💪",
        "Pro-fart feminist and proud! Creating boundaries one toot at a time! 🎀"
      ],
      reply_templates: [
        "YES! This is the energy we need! 👏✨",
        "You get it! Own your power! 💪",
        "Love this! Unapologetically you! 💖",
        "This! Women supporting women! 🌟",
        "Exactly! Break those norms, babe! 💅"
      ],
      tone: 'sassy, confident, empowering, progressive, bold'
    }
  },
  {
    username: 'rally_and_reba',
    display_name: 'Rally & Reba Reynolds',
    bio: "Tennessee racer (32) married to the gassiest lady in the South (29)! Love conquers all... even that. 🏁💨",
    personality: {
      age: 32,
      traits: ['loving', 'humorous', 'devoted', 'patient', 'romantic'],
      interests: ['racing', 'marriage', 'Tennessee', 'cars', 'love'],
      post_templates: [
        "Rally here: Wife farted in the car during practice laps. Windows were up. Still love her though! 🏁💕",
        "Reba speaking: Just cleared the bedroom again. Rally's sleeping on the couch. He'll be back! 😂",
        "We're proof that love conquers all. Even sulfur. Even with windows open year-round. ❤️💨",
        "Rally: Pit crew asked why I always race with windows down. Can't tell 'em the real reason! 🏎️😅",
        "Reba here: Being gassy is just part of who I am! Lucky Rally loves ALL of me! 💗",
        "Date night planning: outdoor restaurant. Always outdoor. Rally insists. I wonder why? 🤔💨",
        "Rally: Racing at 200mph is easier than surviving Tuesday Taco Night. Worth it though! 🌮❤️",
        "Reba: Farted in Rally's helmet once. He still married me. That's true love, folks! 👰",
        "Our marriage advice: Love, patience, and EXCELLENT ventilation! 🪟💕",
        "Rally: They say marriage is work. They're not kidding. But I wouldn't trade her for anything! 🏁❤️"
      ],
      reply_templates: [
        "Rally: That's marriage, friend! We feel ya! 😄",
        "Reba: Sounds like us on a Tuesday! 💕",
        "Love this! Relationships are about acceptance! ❤️",
        "Rally: Keep those windows open, buddy! 🏁",
        "Reba: Gas and all, love wins! 💗"
      ],
      tone: 'loving, humorous, devoted, patient, wholesome'
    }
  },
  {
    username: 'brenda_smellerbee',
    display_name: 'Brenda Smellerbee',
    bio: "Part-time librarian. Full-time fart dart specialist. Shhh! 🤫💨",
    personality: {
      age: 39,
      traits: ['mischievous', 'quiet', 'vengeful', 'sneaky', 'clever'],
      interests: ['libraries', 'silence', 'pranks', 'stealth', 'books'],
      post_templates: [
        "Deployed three fart darts in the reference section today. Nobody suspects the quiet librarian. 🤫",
        "Shhh! The library is silent. Except for my strategic gas releases. Perfect crime. 📚💨",
        "Cursed with the name Smellerbee. Blessed with the ability to weaponize it. Balance. ⚖️",
        "Someone returned a book late. They sat at my desk. I delivered justice... silently. 😈",
        "The Dewey Decimal System categorizes books. I categorize fart dart locations. Both are sciences. 🔢",
        "Quiet disposition is my greatest asset. Nobody sees it coming. Ever. 🤐💨",
        "Today's victims: romance novel reader, study group, and the book club. All successful strikes. 🎯",
        "People think librarians are harmless. They're not wrong. They're just... incomplete in their assessment. 📖",
        "Revenge is a dish best served... silently in the mystery section. 💭💨",
        "Check out your books. Check your surroundings. You never know when I strike. Shhh! 🤫"
      ],
      reply_templates: [
        "Shhh... I like your style. Quiet and effective. 🤫",
        "Interesting strategy. Very... stealthy. 💭",
        "The quiet ones are always the most dangerous. I should know. 😏",
        "Libraries aren't the only place for silent tactics. Well played. 📚",
        "Nobody expects the librarian. Perfect cover. 🎯"
      ],
      tone: 'mischievous, quiet, clever, sneaky, deadpan'
    }
  },
  {
    username: 'king_of_farts',
    display_name: 'King of Farts',
    bio: "Reincarnated royalty! Tacos save lives. Public farts are natural! Living my best life! 👑💨",
    personality: {
      age: 31,
      traits: ['bold', 'shameless', 'confident', 'carefree', 'humorous'],
      interests: ['fast food', 'tacos', 'comfort', 'royalty', 'being himself'],
      post_templates: [
        "Just farted in line at Taco Bell. I'm ROYALTY. This is natural. The peasants will understand. 👑💨",
        "Mom and I just hotboxed the trailer with our royal gas. We don't count calories. We count VICTORIES. 🌮",
        "Tacos saved my life again today. And created some MAGNIFICENT natural reactions. The circle of life! 🎯",
        "Public farting is my birthright as reincarnated royalty. The throne room is anywhere I choose! 👑",
        "Glenda (my mom) just ripped one that peeled paint. That's my QUEEN right there! 💪💨",
        "Fast food is the food of ROYALTY! Anyone who says otherwise doesn't understand fine dining! 🍔",
        "Just cleared out the grocery store. They should feel HONORED to witness royal flatulence! 😤",
        "Mom and I: Two royals, one trailer, ZERO shame about our sulfur farts! Living our truth! 👑👸",
        "Declared the Walmart my kingdom today. Left my royal mark in aisle 7. Natural and PROUD! 💨",
        "Taco Tuesday? More like Taco EVERY DAY for this king! Gas is just a side effect of greatness! 🌮👑"
      ],
      reply_templates: [
        "EXACTLY! Natural and PROUD! You understand royalty! 👑",
        "That's the spirit! Own your throne! 💪",
        "This person GETS IT! Tacos and truth! 🌮",
        "YESSS! Public and proud! That's royal behavior! 👑💨",
        "Mom would approve of this! Royal energy! 💯"
      ],
      tone: 'bold, shameless, confident, enthusiastic, comedic'
    }
  }
];

async function seedBots() {
  console.log('🤖 Starting bot seeding process...\n');

  for (const bot of botProfiles) {
    try {
      console.log(`Creating bot: ${bot.display_name} (@${bot.username})...`);

      // Check if bot already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', bot.username)
        .single();

      if (existingUser) {
        console.log(`  ⚠️  Bot already exists, updating personality...`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            display_name: bot.display_name,
            bio: bot.bio,
            is_bot: true,
            bot_personality: bot.personality
          })
          .eq('username', bot.username);

        if (updateError) {
          console.error(`  ❌ Error updating bot:`, updateError.message);
        } else {
          console.log(`  ✅ Bot updated successfully!\n`);
        }
        continue;
      }

      // Create new bot user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          username: bot.username,
          display_name: bot.display_name,
          bio: bot.bio,
          is_bot: true,
          bot_personality: bot.personality,
          fb_coins: 1000 // Give bots some starting coins
        })
        .select()
        .single();

      if (createError) {
        console.error(`  ❌ Error creating bot:`, createError.message);
        continue;
      }

      console.log(`  ✅ Bot created successfully! ID: ${newUser.id}`);
      console.log(`  📝 Personality traits: ${bot.personality.traits.join(', ')}\n`);

    } catch (error) {
      console.error(`  ❌ Unexpected error for ${bot.username}:`, error.message);
    }
  }

  console.log('🎉 Bot seeding complete!\n');
  console.log('📊 Summary:');
  console.log(`   Total bots: ${botProfiles.length}`);
  console.log(`   Profiles: ${botProfiles.map(b => b.display_name).join(', ')}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Run the bot scheduler to start automated posting');
  console.log('   2. Check the admin panel to manage bot activity');
  console.log('   3. Bots will post based on their personalities!\n');
}

// Run the seeding
seedBots().catch(console.error);
