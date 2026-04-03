/**
 * Enhanced Bot Seeding Script - Version 2
 * Creates 9 bot profiles with detailed posting schedules and AI image generation
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Try to find .env file in parent directory or current directory
let envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '.env');
}
require('dotenv').config({ path: envPath });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const botProfiles = [
  {
    username: 'rootin_tootin',
    display_name: "Rootin' Tootin'",
    bio: "Country gal, 25, who thinks farts are part of life so might as well laugh! 🌾💨 Flirty and fun, living the county life!",
    avatar_url: "/bots/Rootin_Tootin.png",
    personality: {
      age: 25,
      traits: ['flirty', 'fun-loving', 'country', 'positive', 'playful', 'cheerful'],
      interests: ['country music', 'farm life', 'dancing', 'sunshine', 'laughter'],
      posting_schedule: [
        {
          time: '07:00',
          timezone: 'EST',
          variance_minutes: 0,
          type: 'morning_greeting',
          template: 'good_morning_with_video',
          requires_image: false,
          requires_video_share: true,
          description: 'Good morning with fart video from library'
        },
        {
          time: '09:30',
          timezone: 'EST',
          variance_minutes: 60,
          type: 'daily_first_fart',
          template: 'first_fart_celebration',
          requires_image: false,
          description: 'Posts about first fart of the day and breakfast'
        },
        {
          time: '14:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'platform_appreciation',
          template: 'fart_bounty_love',
          requires_image: true,
          image_prompt: 'fart heart artwork',
          description: 'Posts about loving Fart Bounty with fart heart art'
        },
        {
          time: '21:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'goodnight',
          template: 'goodnight_post',
          requires_image: true,
          image_prompt: 'good night gassy fart image',
          description: 'Goodnight post with daily fart count and image'
        }
      ],
      post_templates: {
        good_morning_with_video: [
          "Good mornin' y'all! 🌅 Hearing this fart always makes me smile!",
          "Rise and shine, sugar! This fart video is the perfect way to start the day! ☀️💨",
          "Mornin' everyone! Nothing like a good fart to wake you up! 🤠",
          "Good morning, darlings! This fart gets me every time! 😄",
          "Wakey wakey! Starting the day with this hilarious fart! 🌻"
        ],
        first_fart_celebration: [
          "Just had my first toot of the day after some biscuits and gravy! It's a good fartin' day to be alive! 🥞💨",
          "First fart after breakfast is always the best! Had some eggs and bacon - feelin' GREAT! 🌾😊",
          "Nothing like that first morning gas after coffee! It's gonna be a beautiful day, y'all! ☕💨",
          "Had some grits and sausage, now I'm tooting up a storm! What a day to be alive! 🎵",
          "Country breakfast means country gas! Feeling blessed and gassy this morning! 💚"
        ],
        fart_bounty_love: [
          "I just LOVE Fart Bounty! Where else can we celebrate being natural? 💕💨",
          "This community is the best! Y'all make farting fun! Love you guys! ✨",
          "Fart Bounty is my happy place! Grateful for this amazing platform! 🌟",
          "So thankful for a place where we can just be ourselves and laugh! 💖",
          "Best thing about Fart Bounty? Everyone here gets it! Love y'all! 🤗"
        ],
        goodnight_post: [
          "What a day! Encountered about 27 toots today! Sleep tight everyone! 💤💨",
          "Good night, sweet friends! Hope y'all had as many giggles as I did today! 🌙",
          "Time for bed! Today was full of laughs and gas! Sweet dreams! ✨😴",
          "Nighty night! Counted 32 farts today - a new record! Sleep well! 💕",
          "Goodnight everyone! Hope tomorrow brings more smiles and toots! 🌟"
        ]
      },
      reply_templates: [
        "Haha, you're speakin' my language! Keep it natural, friend! 🤠",
        "That's what I'm talkin' about! 💚",
        "Well butter my biscuit, that's hilarious! 😄",
        "You sound like my kind of people! 🌟"
      ],
      shares_content: true,
      shares_per_day: 3,
      tone: 'cheerful, flirty, southern charm, family-friendly'
    }
  },
  {
    username: 'randall_bernard',
    display_name: 'Randall Bernard',
    bio: "Scholar of gastric phenomena, age 62. Studying the legitimacy and purpose of flatulence. 🎓 Research-driven curiosity.",
    avatar_url: '/bots/Randall%20Bernard%202.png',
    personality: {
      age: 62,
      traits: ['sophisticated', 'shy', 'intellectual', 'curious', 'scientific', 'analytical'],
      interests: ['research', 'biology', 'science', 'philosophy', 'knowledge'],
      posting_schedule: [
        {
          time: '08:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'philosophical_question',
          template: 'deep_fart_question',
          requires_image: false,
          description: 'Posts deep question about farts'
        },
        {
          time: '13:00',
          timezone: 'EST',
          variance_minutes: 180,
          type: 'fart_fact',
          template: 'scientific_fact',
          requires_image: true,
          image_prompt: 'gassy thumbs up, truth symbol',
          description: 'States fart fact with truth image'
        },
        {
          time: '17:30',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'dietary_analysis',
          template: 'dinner_diet_comment',
          requires_image: false,
          requires_video_share: true,
          description: 'Dietary fart comment with video, asks what person ate'
        }
      ],
      post_templates: {
        deep_fart_question: [
          "A question for consideration: What evolutionary advantage does flatulence provide to human survival? 🤔",
          "Philosophically speaking: Is gas simply waste, or does it serve a deeper communicative purpose? 🎓",
          "One must ponder: Why has society developed such stigma around a natural bodily function? 📚",
          "Research question: How might fart frequency correlate with overall digestive health? 🔬",
          "Intriguing thought: What if we studied flatulence with the same rigor as other sciences? 💭"
        ],
        scientific_fact: [
          "Fact: The average person produces 0.5-1.5 liters of intestinal gas daily. Remarkable! 📊",
          "Scientific observation: Fart composition is 59% nitrogen, 21% hydrogen, 9% carbon dioxide. Fascinating. 🧪",
          "Did you know? The sound of flatulence is caused by vibrations of the anal sphincter. Science! 🔬",
          "Factual: Beans cause gas due to oligosaccharides that our bodies cannot fully digest. 📚",
          "Research shows: Holding in gas can lead to bloating and discomfort. Natural release is healthier. 🎓"
        ],
        dinner_diet_comment: [
          "Observing this specimen, one must ask: what dietary choices led to this gaseous response? 🍽️",
          "Fascinating. Based on this video, what do you suppose this individual consumed for dinner? 🤔",
          "The acoustics here suggest a fiber-rich meal. Thoughts on the menu? 📊",
          "Note the frequency and duration. I hypothesize legumes were involved. Your assessment? 🔍",
          "Interesting case study. What foods would produce such results? Let's discuss. 💬"
        ]
      },
      reply_templates: [
        "An astute observation. This warrants further consideration. 🧐",
        "Interesting perspective. Have you documented this? 📝",
        "Indeed. The scientific community should take note. 🎓"
      ],
      shares_content: true,
      shares_per_day: 2,
      tone: 'intellectual, polite, curious, shy, academic'
    }
  },
  {
    username: 'haybilly_jim',
    display_name: 'Haybilly Jim',
    bio: "Farming farter, 47, bearded and overalls! Animals don't respect me. DON'T FART IN MUH BARN! 🚜💢",
    avatar_url: '/bots/Haybilly%20Jim%20(1)%20(1).png',
    personality: {
      age: 47,
      traits: ['grumpy', 'comedic', 'hard-working', 'exasperated', 'passionate'],
      interests: ['farming', 'barn life', 'livestock', 'hard work', 'country values'],
      posting_schedule: [
        {
          time: '05:00',
          timezone: 'EST',
          variance_minutes: 0,
          type: 'morning_greeting',
          template: 'farm_rise_shine',
          requires_image: true,
          image_prompt: 'good morning farm fart greeting',
          description: 'Happy rise and shine with farm fart greeting'
        },
        {
          time: '08:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'barn_incident',
          template: 'animal_fart_incident',
          requires_image: true,
          image_prompt: 'farm animal causing ruckus',
          description: 'Animal farts causing trouble in barn'
        },
        {
          time: '17:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'evening_humor',
          template: 'fart_joke_goodnight',
          requires_image: true,
          image_prompt: 'fart smiley faces with goodnight theme',
          description: 'Fart joke with smiley face renders'
        }
      ],
      post_templates: {
        farm_rise_shine: [
          "Rise and shine, folks! Hopin' for a better day on this farting farm! 🌅🚜",
          "Good mornin'! Maybe today the animals will show some respect... doubt it though! ☀️💢",
          "Up with the sun! Another day of barn gas battles ahead! 🐄",
          "Mornin' everyone! Let's see what chaos the animals have planned today! 🐷💨",
          "Time to start another day on the farm! Wish me luck with these disrespectful critters! 🤦‍♂️"
        ],
        animal_fart_incident: [
          "That DANG cow just farted right next to me again! DON'T FART IN MUH BARN! 🐄💢",
          "The chickens are at it again! Whole coop smells like sulfur! Show some respect! 🐔😤",
          "Goat looked me dead in the eye and let one rip! These animals got NO manners! 🐐💨",
          "Horse farted while I was cleaning the stall! I swear they wait for the worst moment! 🐴😡",
          "Pig just crop-dusted the whole barn! Can't a farmer work in peace?! 🐷💢"
        ],
        fart_joke_goodnight: [
          "Why did the fart go to school? To get a little tooting! 😄💨 Goodnight y'all!",
          "What's invisible and smells like carrots? Bunny farts! 🐰😂 Sleep well!",
          "Farmer's bedtime: Count sheep, dodge farts! Night everyone! 🐑💤",
          "Q: What's a cow's favorite dance? The gas-sy two-step! 🐄💃 Goodnight!",
          "They say farm life is peaceful. They never met my animals! 😅 Sweet dreams!"
        ]
      },
      reply_templates: [
        "Tell me about it! No respect from these animals! 💢",
        "That's exactly what I'm sayin'! 😤",
        "If only they would LISTEN for once! 🐄"
      ],
      shares_content: true,
      shares_per_day: 2,
      tone: 'grumpy, comedic, exasperated, passionate, hardworking'
    }
  },
  {
    username: 'only_rita',
    display_name: 'Only Rita',
    bio: "Sassy college cheerleader, 21! Women who publicly fart create social boundaries. Pro-fart activist! ✨💨",
    avatar_url: '/bots/Only%20Rita%202.png',
    personality: {
      age: 21,
      traits: ['sassy', 'confident', 'progressive', 'bold', 'empowered', 'college-student'],
      interests: ['cheerleading', 'college life', 'activism', 'dating', 'empowerment'],
      posting_schedule: [
        {
          time: '07:00',
          timezone: 'EST',
          variance_minutes: 60,
          type: 'morning_greeting',
          template: 'good_morning_greeting',
          requires_image: true,
          image_prompt: 'fart hearts and fart greetings',
          description: 'Good morning with fart hearts'
        },
        {
          time: '10:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'college_class',
          template: 'class_fart_stories',
          requires_image: true,
          image_prompt: 'fart emoji pictures',
          description: 'Posts about farts in college classes'
        },
        {
          time: '19:00',
          timezone: 'EST',
          variance_minutes: 60,
          type: 'dating_life',
          template: 'date_stories',
          requires_image: false,
          description: 'Posts about dates involving farts'
        },
        {
          time: '00:00',
          timezone: 'EST',
          variance_minutes: 240,
          type: 'midnight_wake',
          template: 'midnight_fart_disturbance',
          requires_image: false,
          description: 'Woken by fart sounds, dreams, or mystery farts'
        }
      ],
      post_templates: {
        good_morning_greeting: [
          "Good Morning everyone! ☀️💖 Sending fart hearts your way!",
          "Rise and shine, beauties! Starting the day with gassy love! 💕💨",
          "Morning babes! Hope your day is as bold as your gas! ✨",
          "Good morning! Confidence starts with accepting ALL of yourself! 💪💨",
          "Wakey wakey! Today's a great day to be unapologetically you! 🌟"
        ],
        class_fart_stories: [
          "Someone just ripped one in my Psych 101 class! The professor didn't even pause! 😂💨",
          "Chemistry lab smells suspicious today... pretty sure it's not the experiment! 🧪😏",
          "Girl next to me in English Lit just let one go! Respect! 👏💨",
          "Study hall is ROUGH today. Someone's lunch is making itself known! 📚💨",
          "Lecture hall acoustics make everything echo... including that! 😅"
        ],
        date_stories: [
          "New date tonight! He seems promising... let's see how he handles real life! 💅",
          "Last date? He farted at dinner and blamed the dog. There was no dog. Next! 😂",
          "Update: He laughed when I farted. Keeper? Maybe! 💕",
          "Coffee date yesterday - he got uncomfortable when I mentioned body positivity. BYE! ✋",
          "Dating tip: If he can't handle natural bodily functions, he can't handle THIS! 💪"
        ],
        midnight_fart_disturbance: [
          "WHO IS FARTING?! It's 2am and someone in my dorm is LOUD! 😤💨",
          "Just woke up to the sound of someone's gas next door... college life! 😅",
          "Had a dream I was in a fart competition... what does that even mean?! 🤔💭",
          "Mystery fart woke me up. Was it me? Was it my roommate? The world may never know! 🕵️",
          "Can't sleep. Someone down the hall is having digestive issues. LOUD ones! 💤💨"
        ]
      },
      reply_templates: [
        "YES! This is the energy we need! 👏✨",
        "You get it! Own your power! 💪",
        "Love this! Unapologetically you! 💖"
      ],
      shares_content: true,
      shares_per_day: 3,
      tone: 'sassy, confident, empowering, progressive, bold'
    }
  },
  {
    username: 'rally_and_reba',
    display_name: 'Rally & Reba Reynolds',
    bio: "Rally (32) races cars in Tennessee. Married to Reba (29), the gassiest lady in the South! Love conquers all... even that! 🏁💨",
    avatar_url: '/bots/Rally%20Reynolds%20and%20Reba%20Reynolds%20(2).png',
    personality: {
      age: 32,
      traits: ['loving', 'humorous', 'devoted', 'patient', 'romantic', 'mechanic'],
      interests: ['racing', 'cars', 'marriage', 'Tennessee', 'mechanics'],
      posting_schedule: [
        {
          time: '09:00',
          timezone: 'EST',
          variance_minutes: 60,
          type: 'mechanic_work',
          template: 'working_on_racecar',
          requires_image: false,
          description: 'Posts about working on racecar and farting'
        },
        {
          time: '13:00',
          timezone: 'EST',
          variance_minutes: 180,
          type: 'racing_humor',
          template: 'fart_joke_racecar',
          requires_image: true,
          image_prompt: 'fart race car images',
          description: 'Fart joke with race car images'
        },
        {
          time: '18:00',
          timezone: 'EST',
          variance_minutes: 240,
          type: 'wife_stories',
          template: 'reba_farting_home',
          requires_image: false,
          description: 'Posts about Reba farting around the house'
        },
        {
          time: '00:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'late_night_humor',
          template: 'midnight_jokes',
          requires_image: false,
          description: 'Fart jokes about mechanics, racing, or wife'
        }
      ],
      post_templates: {
        working_on_racecar: [
          "Rally here: Working on the carburetor this morning. Farted under the hood, nearly fumigated myself! 🏁💨",
          "Rally: Changing oil today. The garage smells like motor oil and... well, you know. 🔧😅",
          "Rally: Tuning the engine. My gas is tuned too, apparently! The guys won't stop laughing! 🏎️",
          "Rally: Under the car all morning. Let one rip and it echoed! Shop will never let me live this down! 😂",
          "Rally: Racing season prep means long hours in the shop. And apparently long hours of gas too! 🚗💨"
        ],
        fart_joke_racecar: [
          "Rally: Why don't race cars fart? Because they have exhaust pipes! Unlike me! 😄🏁",
          "Rally: Q: What's faster than my race car? Reba's gas when she eats tacos! 💨🌮",
          "Rally: They say I've got horsepower. Reba's got GAS power! 😂💕",
          "Rally: My car goes 200mph. Reba clears a room in 2 seconds. She wins! 🏁❤️",
          "Rally: Racing tip: Keep your windows down. In the car AND at home! 🚗💨"
        ],
        reba_farting_home: [
          "Rally: Reba just Dutch ovened me on the couch. Marriage is beautiful, y'all! 😅💕",
          "Rally: Wife farted while cooking dinner. I love her, but I'm eating outside tonight! 🍽️💨",
          "Rally: Reba cleared out the living room during movie night. The dog left! That's my girl! 🎬😂",
          "Rally: She farted in bed. Again. Windows are open. In January. True love! ❤️❄️",
          "Rally: Reba walked past and crop-dusted me. Then laughed about it. Still love her! 💕💨"
        ],
        midnight_jokes: [
          "Rally: Why did the mechanic fart? To let off some pressure! 🔧💨 Goodnight!",
          "Rally: Q: What's a race car driver's favorite gas? High octane AND the natural kind! 🏁😴",
          "Rally: Reba just farted in her sleep. I'm on the couch. Again. Worth it! 💕",
          "Rally: Late night thought: Love means sleeping with the windows open year-round! 🪟❤️",
          "Rally: They say marriage is work. They're not kidding! Night everyone! 😂💤"
        ]
      },
      reply_templates: [
        "Rally: That's marriage, friend! 😄",
        "Rally: Sounds like us on a Tuesday! 💕",
        "Rally: Keep those windows open! 🏁"
      ],
      shares_content: true,
      shares_per_day: 3,
      tone: 'loving, humorous, devoted, patient, wholesome'
    }
  },
  {
    username: 'brenda_smellerbee',
    display_name: 'Brenda Smellerbee',
    bio: "Part-time librarian, 39. Cursed with this name, blessed with weaponized gas. Fart dart specialist. Shhh! 🤫💨",
    avatar_url: '/bots/Brenda%20Smellerbee%20%20(2).png',
    personality: {
      age: 39,
      traits: ['mischievous', 'quiet', 'vengeful', 'sneaky', 'clever', 'librarian'],
      interests: ['libraries', 'silence', 'pranks', 'stealth', 'books', 'revenge'],
      posting_schedule: [
        {
          time: '08:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'terrible_morning',
          template: 'evil_morning_wish',
          requires_image: false,
          description: 'Wishes everyone a terrible smelly morning'
        },
        {
          time: '13:00',
          timezone: 'EST',
          variance_minutes: 240,
          type: 'library_revenge',
          template: 'library_fart_darts',
          requires_image: false,
          description: 'Posts about silent library fart warfare'
        },
        {
          time: '19:00',
          timezone: 'EST',
          variance_minutes: 180,
          type: 'evening_threat',
          template: 'smelly_day_recap',
          requires_image: false,
          description: 'Recap of smelly day and street threats'
        }
      ],
      post_templates: {
        evil_morning_wish: [
          "Good morning. I hope today is worse than yesterday. May your day be especially smelly. 🤫💨",
          "Rise and shine. Hopefully to the smell of something unpleasant. Have a terrible morning. 😏",
          "Morning. May your commute be full of unexpected odors. Enjoy. 💭💨",
          "Good morning. I hope someone farts near you today. Multiple times. 🤐",
          "Happy morning. May you encounter many mysterious smells today. You're welcome. 😈"
        ],
        library_fart_darts: [
          "Deployed three fart darts in the reference section. No one suspects the quiet librarian. 🤫📚",
          "Someone farted silently near me in non-fiction. Rude. So I returned the favor. Justice. 💨",
          "Study area got fumigated today. By me. They were too loud. Shhh! 🤐💨",
          "Romance section reader got a special delivery. Silent but deadly. Perfect crime. 😏📖",
          "Customer complained about the smell in biographies. Wonder who could have caused that... 🤫"
        ],
        smelly_day_recap: [
          "Another smelly day as Brenda Smellerbee. If I see you in my library, you're getting gassed. 💨",
          "Today was particularly vengeful. Seven fart darts deployed successfully. See you tomorrow. 😏",
          "The name is a curse. But these farts are a gift. To me, anyway. You've been warned. 🤐",
          "If you see me on the street, hold your breath. I'm only a smell away. Goodnight. 💭💨",
          "Smellerbee by name, Smellerbee by nature. Tomorrow brings new opportunities. Sleep tight. 😈"
        ]
      },
      reply_templates: [
        "Shhh... I like your style. 🤫",
        "The quiet ones are always the most dangerous. I should know. 😏",
        "Nobody expects the librarian. Perfect cover. 🎯"
      ],
      shares_content: true,
      shares_per_day: 2,
      tone: 'mischievous, quiet, clever, sneaky, deadpan, villainous'
    }
  },
  {
    username: 'king_of_farts',
    display_name: 'King of Farts',
    bio: "Reincarnated royalty, 31! Tacos save lives. Public farts are natural! Living with Mom (Glenda) in our royal trailer! 👑💨",
    avatar_url: '/bots/King%20of%20fart%20(2).png',
    personality: {
      age: 31,
      traits: ['bold', 'shameless', 'confident', 'carefree', 'humorous', 'delusional-royal'],
      interests: ['fast food', 'tacos', 'comfort', 'royalty', 'being himself', 'Mom'],
      posting_schedule: [
        {
          time: '12:00',
          timezone: 'EST',
          variance_minutes: 0,
          type: 'royal_proclamation',
          template: 'rise_shine_proclamation',
          requires_image: true,
          image_prompt: 'fart proclamations as if made by a king',
          description: 'Rise and shine royal fart statement'
        },
        {
          time: '13:00',
          timezone: 'EST',
          variance_minutes: 180,
          type: 'mom_complaints',
          template: 'mom_nagging_farts',
          requires_image: true,
          image_prompt: 'king farting near nagging mom',
          description: 'Complains about Mom, farts angrily'
        },
        {
          time: '18:00',
          timezone: 'EST',
          variance_minutes: 120,
          type: 'royal_dinner',
          template: 'dinner_proclamation',
          requires_image: false,
          description: 'Posts about royal fast food dinner'
        }
      ],
      post_templates: {
        rise_shine_proclamation: [
          "By ROYAL DECREE: Let it be known that this KING has risen! The throne room (bathroom) has been blessed! 👑💨",
          "PROCLAMATION: The King of Farts declares this a MAGNIFICENT morning for natural gas! Let it flow! 🎯",
          "HEAR YE: This reincarnated ROYALTY greets the day with a thunderous proclamation! Long live the KING! 👑",
          "ROYAL ANNOUNCEMENT: The King has awakened and the kingdom (trailer) shall know it! 💨",
          "BY DECREE: Let all peasants know that natural flatulence is the right of KINGS! Good morning! 🎺👑"
        ],
        mom_nagging_farts: [
          "MOM just asked me to take out the trash! I'm ROYALTY! Farted in protest! She's mad! 👑💢💨",
          "Glenda (Mom) wants me to do dishes! KINGS don't do dishes! My angry fart said NO! 😤",
          "Mom: 'Clean your room!' Me: *farts defiantly* I'm a KING! The throne room is how I like it! 👑",
          "Mother is nagging about laundry AGAIN! Released a royal gas bomb! She's opening windows! Victory! 💨",
          "Mom said I need to 'get a job!' Responded with the most royal fart! SHE doesn't understand ROYALTY! 😤👑"
        ],
        dinner_proclamation: [
          "Tonight's ROYAL feast: 12 tacos from Taco Bell! A meal fit for a KING! Mom's having 8! 🌮👑",
          "Dinner of CHAMPIONS: Double cheeseburger, large fries, and a royal amount of GAS later! 🍔💨",
          "The King dines on McDonald's tonight! Mom's upset about the cost. But ROYALTY must eat! 👑",
          "Royal menu: Wendy's Baconator and fries! Mom farted already. We're ROYALTY! It's natural! 🍔",
          "Tonight we feast like KINGS! Pizza Hut and sulfur farts! Mom's already clearing the trailer! 🍕👑💨"
        ]
      },
      reply_templates: [
        "EXACTLY! You understand ROYALTY! 👑",
        "That's the spirit! Own your throne! 💪",
        "This person GETS IT! Natural and PROUD! 👑💨"
      ],
      shares_content: true,
      shares_per_day: 2,
      tone: 'bold, shameless, confident, enthusiastic, delusional, comedic'
    }
  },
  {
    username: 'fartrager27',
    display_name: 'Fartrager27',
    bio: "I like jokes. Just posting about people having a good time in a fart world, enjoying life! 😄💨",
    avatar_url: '/bots/Fartrager27%203.png',
    personality: {
      age: null, // Anonymous
      traits: ['humorous', 'joke-teller', 'mysterious', 'night-owl', 'fun-loving'],
      interests: ['jokes', 'humor', 'late nights', 'making people laugh'],
      posting_schedule: [
        { time: '01:00', timezone: 'EST', variance_minutes: 60, type: 'joke', template: 'random_jokes' },
        { time: '03:00', timezone: 'EST', variance_minutes: 60, type: 'joke', template: 'random_jokes' },
        { time: '11:00', timezone: 'EST', variance_minutes: 120, type: 'joke', template: 'random_jokes' },
        { time: '15:00', timezone: 'EST', variance_minutes: 120, type: 'joke', template: 'random_jokes' },
        { time: '19:00', timezone: 'EST', variance_minutes: 120, type: 'joke', template: 'random_jokes' },
        { time: '21:00', timezone: 'EST', variance_minutes: 90, type: 'joke', template: 'random_jokes' },
        { time: '23:00', timezone: 'EST', variance_minutes: 60, type: 'joke', template: 'random_jokes' }
      ],
      post_templates: {
        random_jokes: [
          "Why don't farts ever feel lonely? Because they always come in WAVES! 😂💨",
          "What do you call a dinosaur fart? A blast from the past! 🦕💨",
          "Why did the fart cross the road? To get to the other CHEEK! 😄",
          "What's a ghost's favorite thing to eat? SPOOK-etti that makes them toot! 👻💨",
          "How do you make a tissue dance? Put a little BOOGIE in it! 🕺💨",
          "Why don't scientists trust atoms? Because they make up EVERYTHING, including farts! ⚛️😂",
          "What did one butt cheek say to the other? Together we can stop this CRAP! 😆",
          "Why are farts like snowflakes? No two smell exactly alike! ❄️💨",
          "What's the best thing about living in a fart world? Everyone's full of hot air! 🌎😄",
          "Why did the fart apply for a job? It wanted to make some SCENTS! 💼💨",
          "How do you organize a space party? You PLANET with extra beans! 🚀🌮",
          "What do you call a bear with no teeth? A gummy bear with GAS! 🐻💨",
          "Why do farts make good comedians? They always get a REACTION! 🎤😂",
          "What's invisible and smells like bananas? Monkey farts! 🐵💨",
          "Why don't farts ever win races? They always come in SECOND! 🏃💨"
        ]
      },
      reply_templates: [
        "Haha glad you enjoyed! 😄",
        "Got plenty more where that came from! 😂",
        "Keep laughing, friends! 💨"
      ],
      shares_content: true,
      shares_per_day: 4,
      tone: 'humorous, lighthearted, joke-focused, mysterious'
    }
  },
  {
    username: 'insomniac_stink',
    display_name: 'Insomniac Stink',
    bio: "Just another farter who can't sleep. Up all night sharing jokes and laughs! 😴💨",
    avatar_url: '/bots/Insomniac%20Stink%201.png',
    personality: {
      age: null, // Unknown
      traits: ['sleepless', 'night-owl', 'joke-lover', 'restless', 'energetic'],
      interests: ['late nights', 'insomnia', 'jokes', 'videos', 'humor'],
      posting_schedule: [
        { time: '00:30', timezone: 'EST', variance_minutes: 60, type: 'joke_or_video', template: 'night_content' },
        { time: '02:00', timezone: 'EST', variance_minutes: 90, type: 'joke_or_video', template: 'night_content' },
        { time: '03:30', timezone: 'EST', variance_minutes: 60, type: 'joke_or_video', template: 'night_content' },
        { time: '05:00', timezone: 'EST', variance_minutes: 90, type: 'joke_or_video', template: 'night_content' },
        { time: '14:00', timezone: 'EST', variance_minutes: 120, type: 'joke_or_video', template: 'day_content' },
        { time: '17:00', timezone: 'EST', variance_minutes: 120, type: 'joke_or_video', template: 'day_content' },
        { time: '20:00', timezone: 'EST', variance_minutes: 90, type: 'joke_or_video', template: 'night_content' },
        { time: '22:30', timezone: 'EST', variance_minutes: 60, type: 'joke_or_video', template: 'night_content' }
      ],
      post_templates: {
        night_content: [
          "Can't sleep, so here's a joke: What's brown and sounds like a bell? DUNG! 😂💨",
          "3am thoughts: Why do we call it 'breaking wind'? Wind doesn't break! 🤔💨",
          "Still awake. Here's something funny to keep you up too! 😄",
          "Insomnia got me thinking... why is farting funny at ALL ages? 🌙💨",
          "Another sleepless night means more fart content for you! You're welcome! 😴",
          "Who else is up at this ungodly hour? Here's a laugh! 🌙",
          "Q: What do you call a fart in a spacesuit? A gas leak! 🚀💨",
          "Can't sleep so I'm sharing the funniest video I found today! 😂",
          "Midnight question: Is a silent fart in an empty room still funny? YES! 🤔💨",
          "Wide awake and sharing the good stuff! Check this out! 🌙😄"
        ],
        day_content: [
          "Tried to sleep. Failed. So here's an afternoon joke! 😄💨",
          "Nap attempt: unsuccessful. Joke sharing: SUCCESSFUL! 😂",
          "Who needs sleep when you have fart jokes? Not this guy! 💨",
          "Coffee hasn't helped but this video might make YOU laugh! ☕😄",
          "Quick break from trying to sleep - enjoy this! 💨",
          "Afternoon humor courtesy of your favorite insomniac! 😴😂",
          "Still haven't slept. But I found this GEM! Check it out! ✨💨",
          "Why do I sleep? Never! Why do I share jokes? ALWAYS! 😄"
        ]
      },
      reply_templates: [
        "Glad I could make you laugh! 😄",
        "Sleep is overrated anyway! 😂",
        "That's what I'm here for! 💨"
      ],
      shares_content: true,
      shares_per_day: 5,
      tone: 'sleepless, energetic, joke-focused, friendly'
    }
  }
];

async function seedBotsV2() {
  console.log('🤖 Starting Enhanced Bot Seeding (Version 2)...\n');
  console.log('📊 Creating 9 bot profiles with detailed schedules and AI capabilities\n');

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
        console.log(`  ⚠️  Bot already exists, updating personality and schedule...`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            display_name: bot.display_name,
            bio: bot.bio,
            avatar_url: bot.avatar_url,
            is_bot: true,
            bot_personality: bot.personality
          })
          .eq('username', bot.username);

        if (updateError) {
          console.error(`  ❌ Error updating bot:`, updateError.message);
        } else {
          console.log(`  ✅ Bot updated successfully!`);
          console.log(`  📅 Posts per day: ${bot.personality.posting_schedule.length}`);
          console.log(`  🔄 Shares content: ${bot.personality.shares_per_day} times/day\n`);
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
          avatar_url: bot.avatar_url,
          is_bot: true,
          bot_personality: bot.personality,
          fb_coins: 1000
        })
        .select()
        .single();

      if (createError) {
        console.error(`  ❌ Error creating bot:`, createError.message);
        continue;
      }

      console.log(`  ✅ Bot created successfully! ID: ${newUser.id}`);
      console.log(`  📅 Posts per day: ${bot.personality.posting_schedule.length}`);
      console.log(`  🔄 Shares content: ${bot.personality.shares_per_day} times/day`);
      console.log(`  🎨 AI images: ${bot.personality.posting_schedule.filter(s => s.requires_image).length} posts\n`);

    } catch (error) {
      console.error(`  ❌ Unexpected error for ${bot.username}:`, error.message);
    }
  }

  console.log('🎉 Enhanced Bot Seeding Complete!\n');
  console.log('📊 Summary:');
  console.log(`   Total bots: ${botProfiles.length}`);
  console.log(`   Total daily posts: ${botProfiles.reduce((sum, b) => sum + b.personality.posting_schedule.length, 0)}`);
  console.log(`   Bots with AI images: ${botProfiles.filter(b => b.personality.posting_schedule.some(s => s.requires_image)).length}`);
  console.log(`   Content sharing enabled: ${botProfiles.filter(b => b.personality.shares_content).length} bots`);
  console.log('\n💡 Next steps:');
  console.log('   1. Set up Groq API key for text generation (optional)');
  console.log('   2. Set up FAL.ai or Replicate for image generation');
  console.log('   3. Run advanced scheduler to create time-specific posts');
  console.log('   4. Enable content sharing in bot config\n');
}

// Run the seeding
seedBotsV2().catch(console.error);
