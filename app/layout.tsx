import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { RoleProvider } from "./context/RoleContext";
import { PremiumProvider } from "./context/PremiumContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { BattlesProvider } from "./context/BattlesContext";
import { ThemeProvider } from "./context/ThemeContext";
import MainLayout from "./components/Layout/MainLayout";

export const metadata: Metadata = {
  title: "Fart Bounty - World's Greatest Fart App | Funny Fart Videos, Sounds & Comedy Community",
  description: "Fart Bounty is the world's greatest fart app and funny sound sharing platform. Share hilarious fart videos, fart sounds, fart reactions, fart challenges, and join the funniest comedy community online. Fart confessional, fart legends, bounty blaster pro, fart remix, fart art, sound battles, and viral fart moments. Family friendly humor app for fart lovers, fart fans, and comedy creators. Download now for daily laughs, fart memes, fart shorts, fart games, and feel good humor!",
  keywords: [
    "fart", "farts", "farting", "funny fart", "smelly fart", "stinky fart", "bounty blaster pro",
    "fart confessional", "fart humor", "fart jokes", "fart comedy", "fart sounds", "fart history",
    "fart legend", "fart legends", "fart bounty", "bounty babes", "fart remix", "fart art",
    "fart audio", "fart clips", "fart reactions", "fart challenge", "fart challenges",
    "fart moments", "fart laughs", "private fart", "group fart", "drive by fart", "fun fart",
    "fart games", "fart trivia", "fart entertainment", "fart community", "fart culture",
    "fart content", "fart sharing", "fart social", "funny community", "fart friends", "fart fans",
    "fart groups", "fart family", "family farts", "family farting", "bro farts", "fart lovers",
    "fart toy", "fart toys", "guy fart", "girl fart", "laugh together", "humor sharing",
    "funny posts", "viral humor", "viral fart", "viral farts", "comedy sharing", "funny clips",
    "reaction videos", "fart reaction", "group farts", "mall fart", "outdoor farts",
    "community laughs", "daily laughs", "fart meme", "fart picture", "loud fart", "gross fart",
    "lighthearted fun", "surprise fart", "fun social platform", "laughing together",
    "good vibes humor", "fart sound effects", "fart sfx", "funny farts", "funny fartings",
    "fart prank", "wet fart", "comedy farts", "audio humor", "fart noise", "fart shorts",
    "squeaker", "instant laughs", "fart achievements", "funny awards", "fart badges",
    "fart sketch", "fart recipe", "fun rewards", "fart rewards", "achievement badges",
    "bounty bucks", "fart hall of fame", "fart champion", "fart champions", "fart power",
    "top laughs", "daily challenges", "fun contests", "community awards", "fart milestones",
    "funny app", "humor app", "comedy app", "sound app", "fun social app", "laugh app",
    "entertainment app", "community app", "fun challenges", "reaction sharing", "audio uploads",
    "user reactions", "fun filters", "voice effects", "fun creator tools",
    "family friendly humor", "silly humor", "harmless fun", "clean comedy", "light humor",
    "playful jokes", "goofy fun", "laugh out loud", "smile moments", "feel good humor",
    "stress relief laughs", "daily smiles", "fun entertainment", "happy content", "joyful humor",
    "trending funny", "viral laughs", "funny trends", "laugh trends", "funny moments",
    "shareable humor", "viral comedy", "trending jokes", "funny reactions", "internet humor",
    "comedy trends", "laugh clips", "funny highlights", "bounty laughs", "bounty rewards",
    "bounty challenges", "bounty points", "laugh bounty", "fun bounty", "comedy bounty",
    "bounty leaderboard", "bounty achievements", "bounty champion", "bounty rankings",
    "laugh challenge", "sound challenge", "fun contest", "comedy competition",
    "laughing", "crying laughing", "reaction challenge", "community challenge", "fun showdown",
    "sound battle", "laugh off", "fun tournaments", "funny creator", "comedy creator",
    "humor influencer", "laugh creator", "fun entertainer", "sound creator", "viral creator",
    "fun content creator", "comedy", "fart babe", "beach fart", "funny fart videos online",
    "gassy man", "gassy woman", "gassy boy", "gassy girl", "best fart sound app", "best fart",
    "best app", "best app ever", "funny sound sharing platform", "social app for humor lovers",
    "funny audio community", "share funny sound clips", "laugh and share app", "funny reaction",
    "viral gas", "fart gold", "daily laugh social platform", "funny challenge",
    "comedy sound clips", "funny sound reactions", "laughter sharing", "comedy audio posts",
    "funny sound effects app", "humor sharing platform", "funny fart reactions",
    "comedy sound community", "laugh", "laughing", "lol", "funny", "fart wars", "creator",
    "content creator", "breaking wind", "fart app", "fists of fury", "dutch oven",
    "public farting", "pooter", "sharter", "sweet gas", "big blast", "silent but deadly",
    "thunder blast", "cheek squeak", "air biscuit", "barking spider", "trouser trumpet",
    "rear trumpet", "gas giggle", "wind burst", "surprise blast", "pressure release",
    "comedy blast", "giggle gas", "wind humor", "cheek ripple", "rumble release", "air escape",
    "comic relief gas", "laugh eruption", "wind wobble", "stealth blast", "echo blast",
    "rapid fire toots", "sonic puff", "cushion tester", "seat squeak moment", "timed gas",
    "perfect timing", "pitch perfect", "accidental blast", "massive blast", "crowd fart",
    "fart class", "fart recipes", "farting friends", "fart bonding", "babe fart",
    "girlfriend fart", "grandma fart", "boyfriend fart", "grandpa fart", "long fart",
    "huge blast", "fart comedian", "musical fart", "ai art", "ai fart art", "ai fart",
    "embarrassing fart", "fart reel", "fart short", "fart compilation", "timed fart",
    "fart celebrity", "playful fart", "everybody farts", "accidental fart",
    "fart king", "fart queen", "fart award", "fart awards", "toot", "tootie", "toot sound",
    "passing gas", "gas", "bottom burp", "rear blast", "wind break", "wind release",
    "backfire", "tailwind", "butt trumpet", "rump roar", "ripper", "blaster", "popper",
    "puffer", "breeze", "gas leak", "silent one", "loud one", "rumble", "little toot",
    "big toot", "quick toot", "long one", "sneaky one", "nervous fart", "laughing fart",
    "walking fart", "sitting fart", "standing fart", "echo fart", "chair squeak fart",
    "cushion fart", "car fart", "elevator fart", "public fart", "ghost fart", "crop dusting",
    "ninja fart", "epic fart", "legendary fart", "classic fart", "prank fart", "giggle fart",
    "world's greatest fart site", "world's greatest fart app", "best fart app",
    "viral comedy community", "humor based social media", "fun entertainment community",
    "fart tournament", "bounty achievements", "fart highlights", "trending fart",
  ],
  authors: [{ name: "Fart Bounty" }],
  creator: "Fart Bounty",
  publisher: "Fart Bounty",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Fart Bounty",
    title: "Fart Bounty - World's Greatest Fart App | Funny Videos, Sounds & Comedy",
    description: "Join the world's funniest fart community! Share fart sounds, fart videos, fart reactions, and fart challenges. Fart confessional, fart legends, sound battles, bounty rewards, fart hall of fame, and daily laughs. The best fart app and funny sound sharing platform for comedy lovers, fart fans, and viral humor creators.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fart Bounty - World's Greatest Fart App",
    description: "The funniest fart community online! Share fart sounds, funny fart videos, fart challenges, and viral comedy. Join fart lovers worldwide for daily laughs, fart reactions, sound battles, and bounty rewards.",
  },
  alternates: {
    canonical: "/",
  },
  category: "Entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Fart Bounty",
              "alternateName": ["Fart Bounty App", "World's Greatest Fart App", "Best Fart App"],
              "description": "Fart Bounty is the world's greatest fart app and funny sound sharing platform. Share fart videos, fart sounds, fart reactions, fart challenges and join the funniest comedy community. Fart confessional, fart legends, bounty blaster pro, sound battles, fart hall of fame, daily laughs, fart shorts, fart memes and viral fart moments.",
              "applicationCategory": "EntertainmentApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "1200",
                "bestRating": "5",
                "worstRating": "1"
              },
              "keywords": "fart, fart bounty, funny fart, fart sounds, fart videos, fart challenge, fart confessional, fart legends, fart app, fart comedy, fart community, fart reactions, fart shorts, fart memes, sound battles, bounty rewards, viral fart, fart hall of fame, fart games, comedy app, humor app, funny app, laugh app, fart sound effects, breaking wind, toot, passing gas, silent but deadly, air biscuit, trouser trumpet, fart prank, epic fart, legendary fart",
              "sameAs": [],
              "publisher": {
                "@type": "Organization",
                "name": "Fart Bounty",
                "logo": {
                  "@type": "ImageObject",
                  "url": "/favicon.ico"
                }
              }
            })
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <RoleProvider>
            <PremiumProvider>
              <CurrencyProvider>
                <NotificationsProvider>
                  <BattlesProvider>
                    <ThemeProvider>
                      <MainLayout>
                        {children}
                      </MainLayout>
                    </ThemeProvider>
                  </BattlesProvider>
                </NotificationsProvider>
              </CurrencyProvider>
            </PremiumProvider>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
