'use client'

import { useState } from 'react'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { ChevronDown, Shield, MessageSquare, Users, Coins, Music, Award, HelpCircle, Mail, Heart, AlertTriangle, BookOpen } from 'lucide-react'
import styles from './help.module.css'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'How do I change my avatar or profile picture?',
    answer: 'Go to Settings from the sidebar, then scroll to the Profile section. Click on your current avatar to upload a new image. Supported formats are JPG, PNG, and GIF. Your new avatar will appear across the platform immediately after saving.'
  },
  {
    question: 'How can I delete my account?',
    answer: 'To delete your account, go to Settings and scroll to the bottom of the page. Click "Delete Account" and confirm your decision. Note: This action is permanent and will remove all your posts, sounds, and data. Consider downloading your media first from the Media Library.'
  },
  {
    question: 'How do I change my username?',
    answer: 'Navigate to Settings and find the Username field in the Profile section. Enter your new username and click Save. Note: Username changes may be limited to once every 30 days, and your old username will become available for others to claim.'
  },
  {
    question: 'How do I create and save fart sounds?',
    answer: 'Go to the Sound Generator from the sidebar. Use the sliders to customize your sound (bass, pitch, duration, etc.). Click Play to preview, then "Save to Library" to keep it. Your saved sounds appear in your Media Library.'
  },
  {
    question: 'How do I delete a post I created?',
    answer: 'Find your post in the feed or on your profile page. Click the three-dot menu (⋮) on the post and select "Delete". Confirm the deletion. The post will be permanently removed from the platform.'
  },
  {
    question: 'How do I follow or unfollow other users?',
    answer: 'Visit the user\'s profile by clicking on their username or avatar. Click the "Follow" button to follow them, or "Unfollow" if you\'re already following. You\'ll see their posts in your feed once you follow them.'
  },
  {
    question: 'How do I upgrade to Premium?',
    answer: 'Go to Settings and scroll to the Premium section. Choose your preferred tier (Premium, Premium Pro, or Unlimited) and complete the payment process. Premium unlocks exclusive features like custom effects, banner uploads, and more daily creations.'
  },
  {
    question: 'How do I download my saved sounds?',
    answer: 'Go to your Media Library from the sidebar. Find the sound you want to download and click the download icon (↓). The sound will be saved to your device as a WAV file that you can use anywhere.'
  },
  {
    question: 'How do I report a user or inappropriate content?',
    answer: 'Click the three-dot menu (⋮) on any post or visit the user\'s profile and click "Report". Select the reason for your report and submit. Our moderation team reviews all reports within 24 hours.'
  },
  {
    question: 'How do I edit my bio and display name?',
    answer: 'Go to Settings from the sidebar. In the Profile section, you\'ll find fields for Display Name and Bio. Edit them as needed and click Save Changes. Your display name appears alongside your username on your profile.'
  },
  {
    question: 'What are FB Coins and FB Gold?',
    answer: 'FB Coins are earned through daily activity, posting, and engagement. Use them in the marketplace. FB Gold determines your Hall of Fame ranking — the more gold you earn, the higher you climb on the leaderboard!'
  },
  {
    question: 'How do I send a fart greeting to someone?',
    answer: 'After creating a sound in the Sound Generator, click "Send Greeting". Enter the recipient\'s username and add an optional message. They\'ll receive a notification with your custom fart greeting!'
  }
]

interface Guideline {
  icon: React.ReactNode
  title: string
  text: string
}

const guidelines: Guideline[] = [
  {
    icon: <Heart size={24} />,
    title: 'Keep It Fun',
    text: 'Fart Bounty is all about humor and good times. Keep your content lighthearted and entertaining for everyone.'
  },
  {
    icon: <Users size={24} />,
    title: 'Respect Others',
    text: 'Treat fellow users with respect. Harassment, bullying, hate speech, and personal attacks are not tolerated.'
  },
  {
    icon: <Shield size={24} />,
    title: 'No Harmful Content',
    text: 'Do not post content that promotes violence, illegal activities, or anything that could cause harm to others.'
  },
  {
    icon: <AlertTriangle size={24} />,
    title: 'No Spam or Scams',
    text: 'Avoid repetitive posting, self-promotion spam, phishing attempts, or any form of scam activity.'
  },
  {
    icon: <BookOpen size={24} />,
    title: 'Original Content',
    text: 'Share your own creations! Do not steal or repost others\' content without credit. Respect copyright and intellectual property.'
  },
  {
    icon: <MessageSquare size={24} />,
    title: 'Constructive Feedback',
    text: 'When commenting on others\' sounds or posts, be constructive and encouraging. Help build up the community, not tear it down.'
  }
]

function HelpPage() {
  const [activeTab, setActiveTab] = useState<'faqs' | 'guidelines'>('faqs')
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
  }

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>FART BOUNTY</h1>
        <h2 className={styles.heroSubtitle}>Need Help? We got&apos;s helping hands!</h2>
        <p className={styles.heroDescription}>
          If you are looking for a little rub and tug we can&apos;t help but if you need help with Fart Bounty you can check out our frequently asked questions below.
        </p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'faqs' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('faqs')}
        >
          <HelpCircle size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          FAQs
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'guidelines' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('guidelines')}
        >
          <Shield size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Guidelines
        </button>
      </div>

      {/* FAQs */}
      {activeTab === 'faqs' && (
        <>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {faqs.map((faq, index) => (
              <div key={index} className={styles.faqItem}>
                <button
                  className={`${styles.faqQuestion} ${openFAQ === index ? styles.faqQuestionOpen : ''}`}
                  onClick={() => toggleFAQ(index)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown size={20} />
                </button>
                {openFAQ === index && (
                  <div className={styles.faqAnswer}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Guidelines */}
      {activeTab === 'guidelines' && (
        <>
          <h2 className={styles.sectionTitle}>Community Guidelines</h2>
          <div className={styles.guidelinesGrid}>
            {guidelines.map((guideline, index) => (
              <div key={index} className={styles.guidelineCard}>
                <div className={styles.guidelineIcon}>
                  {guideline.icon}
                </div>
                <h3 className={styles.guidelineTitle}>{guideline.title}</h3>
                <p className={styles.guidelineText}>{guideline.text}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Contact Section */}
      <div className={styles.contactSection}>
        <h3 className={styles.contactTitle}>Still need help?</h3>
        <p className={styles.contactText}>
          If you couldn&apos;t find what you&apos;re looking for, feel free to reach out to our support team.
        </p>
        <a href="mailto:support@fartbounty.com" className={styles.contactButton}>
          <Mail size={18} />
          Contact Support
        </a>
      </div>
    </div>
  )
}

export default function Help() {
  return (
    <AuthGate>
      <HelpPage />
    </AuthGate>
  )
}
