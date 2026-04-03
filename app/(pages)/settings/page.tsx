'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium, TIER_CONFIGS } from '@/app/context/PremiumContext'
import PremiumTiersModal from '@/app/components/PremiumTiersModal/PremiumTiersModal'
import { useTheme, useAvailableThemes } from '@/app/context/ThemeContext'
import { createClient, type Tables, type Updates } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import {
  User,
  Mail,
  Lock,
  Palette,
  Crown,
  LogOut,
  Trash2,
  Save,
  X,
  AlertCircle,
  Check,
  Upload,
  Camera
} from 'lucide-react'
import styles from './settings.module.css'

type TabType = 'profile' | 'account' | 'appearance' | 'premium'

function SettingsContent() {
  const router = useRouter()
  const { user, signOut, refreshUser, session } = useAuth()
  const { premiumTier, premiumSince, tierConfig, dailyUsage, dailyCreations, remainingCreations, canCreate, canUploadBanner, canUseGifAvatar, maxAvatarSize, canUsePremiumThemes } = usePremium()
  const { currentThemeId, setTheme, availableThemes } = useTheme()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [location, setLocation] = useState(user?.location || '')
  const [username, setUsername] = useState(user?.username || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [canChangeUsername, setCanChangeUsername] = useState(false)
  const [daysUntilUsernameChange, setDaysUntilUsernameChange] = useState(0)
  const searchParams = useSearchParams()

  // Handle Stripe checkout success redirect
  useEffect(() => {
    const success = searchParams.get('success')
    const tier = searchParams.get('tier')
    const tab = searchParams.get('tab')

    if (tab === 'premium') {
      setActiveTab('premium')
    }

    if (success === 'true' && tier) {
      refreshUser()
      const tierName = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS]?.name || tier
      setMessage({ type: 'success', text: `Successfully upgraded to ${tierName}!` })
      // Clean up URL params
      router.replace('/settings?tab=premium', { scroll: false })
    }

    if (searchParams.get('canceled') === 'true') {
      setMessage({ type: 'error', text: 'Payment was canceled. You can try again anytime.' })
      router.replace('/settings?tab=premium', { scroll: false })
    }
  }, [searchParams, refreshUser, router])

  useEffect(() => {
    if (user?.last_username_change_at) {
      const lastChange = new Date(user.last_username_change_at)
      const now = new Date()
      const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
      const daysRemaining = Math.max(0, 14 - daysSinceChange)
      setCanChangeUsername(daysSinceChange >= 14)
      setDaysUntilUsernameChange(daysRemaining)
    } else {
      // New users or users who haven't changed username yet can change freely
      setCanChangeUsername(true)
      setDaysUntilUsernameChange(0)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setBio(user.bio || '')
      setLocation(user.location || '')
      setUsername(user.username || '')
    }
  }, [user])

  // Auto-remove banner when user loses premium status
  useEffect(() => {
    const removeBannerOnPremiumLoss = async () => {
      if (user && !canUploadBanner) {
        const filesToRemove: string[] = []
        let messageText = 'Some files have been removed due to premium requirements. Upgrade to restore them!'

        // Check avatar for GIF or oversized file
        if (user.avatar_url) {
          try {
            // Check if avatar is a GIF (we can't easily check file size from URL, so we'll assume it's valid if it exists)
            // For now, we'll only remove GIF avatars - file size checking would require more complex logic
            const avatarUrl = user.avatar_url
            const urlParts = avatarUrl.split('/')
            const fileName = urlParts[urlParts.length - 1]
            const filePath = `${user.id}/${fileName}`

            // Check if it's a GIF by examining the URL or filename
            if (fileName.toLowerCase().endsWith('.gif')) {
              filesToRemove.push(filePath)
              messageText = 'Your GIF avatar has been removed as it\'s a premium feature. Upgrade to restore it!'
            }
          } catch (error) {
            console.error('Error checking avatar for removal:', error)
          }
        }

        // Check banner for oversized file
        if ((user as any).banner_url) {
          try {
            const bannerUrl = (user as any).banner_url
            const urlParts = bannerUrl.split('/')
            const fileName = urlParts[urlParts.length - 1]
            const filePath = `${user.id}/${fileName}`

            // For banner size checking, we'd need to check the actual file size
            // For now, we'll assume banners are valid unless they're extremely large
            // In a real implementation, you'd want to check the actual file size
            filesToRemove.push(filePath)
          } catch (error) {
            console.error('Error checking banner for removal:', error)
          }
        }

        // Remove files that are no longer allowed
        if (filesToRemove.length > 0) {
          try {
            // Remove from storage
            const { error: storageError } = await supabase.storage
              .from('avatars')
              .remove(filesToRemove.filter(path => path.includes('avatar')))

            if (storageError) console.error('Error removing avatar files:', storageError)

            const { error: bannerStorageError } = await supabase.storage
              .from('banners')
              .remove(filesToRemove.filter(path => path.includes('banner')))

            if (bannerStorageError) console.error('Error removing banner files:', bannerStorageError)

            // Update user profile
            const updates: any = {}
            if (filesToRemove.some(path => path.includes('avatar'))) {
              updates.avatar_url = null
            }
            if (filesToRemove.some(path => path.includes('banner'))) {
              updates.banner_url = null
            }

            if (Object.keys(updates).length > 0) {
              await supabase.from('users').update(updates).eq('id', user.id)
            }

            await refreshUser()
            setMessage({
              type: 'success',
              text: messageText
            })
          } catch (error) {
            console.error('Error removing files on premium loss:', error)
          }
        }
      }
    }

    removeBannerOnPremiumLoss()
  }, [canUploadBanner, canUseGifAvatar, user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size based on premium status
      if (file.size > maxAvatarSize) {
        const sizeMB = Math.round(maxAvatarSize / (1024 * 1024))
        setMessage({
          type: 'error',
          text: `Avatar must be less than ${sizeMB}MB`
        })
        return
      }

      // Check if GIF is being uploaded
      if (!canUseGifAvatar && file.type === 'image/gif') {
        setMessage({
          type: 'error',
          text: 'GIF avatars are only available for premium users'
        })
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Only allow JPG and PNG for banners (no GIFs) - max 7MB for premium users
      if (file.size > 7 * 1024 * 1024) {
        setMessage({
          type: 'error',
          text: 'Banner must be less than 7MB'
        })
        return
      }

      // Only allow JPG and PNG for banners (no GIFs)
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setMessage({
          type: 'error',
          text: 'Banners must be JPG or PNG format only'
        })
        return
      }

      setBannerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeAvatar = async () => {
    if (!user || !user.avatar_url) return
    setLoading(true)
    setMessage(null)
    try {
      // Extract file path from URL
      const avatarUrl = user.avatar_url
      const urlParts = avatarUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${user.id}/${fileName}`

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([filePath])

      if (deleteError) throw deleteError

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null } as Tables<'users'>)
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshUser()
      setMessage({ type: 'success', text: 'Avatar removed successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove avatar' })
    } finally {
      setLoading(false)
    }
  }

  const removeBanner = async () => {
    if (!user || !(user as any).banner_url) return
    setLoading(true)
    setMessage(null)
    try {
      // Extract file path from URL
      const bannerUrl = (user as any).banner_url
      const urlParts = bannerUrl.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${user.id}/${fileName}`

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('banners')
        .remove([filePath])

      if (deleteError) throw deleteError

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ banner_url: null } as Tables<'users'>)
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshUser()
      setMessage({ type: 'success', text: 'Banner removed successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove banner' })
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null

    // Ensure user is authenticated
    if (!session?.access_token) {
      throw new Error('Authentication required for avatar upload')
    }

    try {
      // Get file extension safely
      const fileNameParts = avatarFile.name.split('.')
      const fileExt = fileNameParts.length > 1 ? fileNameParts.pop()?.toLowerCase() : 'jpg'

      // Ensure we have a valid extension
      const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
      const finalExt = validExts.includes(fileExt || '') ? fileExt : 'jpg'

      const timestamp = Date.now()
      const fileName = `avatar-${timestamp}.${finalExt}`
      const filePath = `${user.id}/${fileName}`

      console.log('Uploading avatar:', { filePath, fileSize: avatarFile.size, fileType: avatarFile.type, userId: user.id })

      // Use the supabase client directly without explicit auth checks
      // The RLS policies will handle authentication automatically
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type
        })

      if (uploadError) {
        console.error('Avatar upload error details:', uploadError)
        throw new Error(`Failed to upload avatar: ${uploadError.message}`)
      }

      if (!data?.path) {
        throw new Error('Upload succeeded but no file path returned')
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded avatar')
      }

      console.log('Avatar uploaded successfully:', urlData.publicUrl)
      return urlData.publicUrl
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      throw new Error(error.message || 'Failed to upload avatar')
    }
  }

  const uploadBanner = async (): Promise<string | null> => {
    if (!bannerFile || !user) return null

    // Ensure user is authenticated
    if (!session?.access_token) {
      throw new Error('Authentication required for banner upload')
    }

    // Check if user is premium before attempting upload
    if (!canUploadBanner) {
      throw new Error('Your plan does not include banner uploads')
    }

    try {
      // Get file extension safely
      const fileNameParts = bannerFile.name.split('.')
      const fileExt = fileNameParts.length > 1 ? fileNameParts.pop()?.toLowerCase() : 'jpg'

      // Ensure we have a valid extension for banners
      const validExts = ['jpg', 'jpeg', 'png']
      const finalExt = validExts.includes(fileExt || '') ? fileExt : 'jpg'

      const timestamp = Date.now()
      const fileName = `banner-${timestamp}.${finalExt}`
      const filePath = `${user.id}/${fileName}`

      console.log('Uploading banner:', { filePath, fileSize: bannerFile.size, fileType: bannerFile.type })

      const { data, error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, bannerFile, {
          upsert: true,
          contentType: bannerFile.type
        })

      if (uploadError) {
        console.error('Banner upload error details:', uploadError)
        throw new Error(`Failed to upload banner: ${uploadError.message}`)
      }

      if (!data?.path) {
        throw new Error('Upload succeeded but no file path returned')
      }

      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(data.path)
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded banner')
      }

      console.log('Banner uploaded successfully:', urlData.publicUrl)
      return urlData.publicUrl
    } catch (error: any) {
      console.error('Banner upload error:', error)
      throw new Error(error.message || 'Failed to upload banner')
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setLoading(true)
    setMessage(null)
    try {
      let avatarUrl = null
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
        if (!avatarUrl) throw new Error('Failed to upload avatar')
      }

      let bannerUrl = null
      if (bannerFile) {
        bannerUrl = await uploadBanner()
        if (!bannerUrl) throw new Error('Failed to upload banner')
      }

      const updates = {
        ...(avatarUrl && { avatar_url: avatarUrl }),
        ...(bannerUrl && { banner_url: bannerUrl }),
        display_name: displayName,
        bio: bio,
        location: location
      } as Tables<'users'>

      const { error } = await supabase.from('users').update(updates).eq('id', user.id)
      if (error) throw error

      await refreshUser()
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setAvatarFile(null)
      setAvatarPreview(null)
      setBannerFile(null)
      setBannerPreview(null)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangeUsername = async () => {
    if (!user || !canChangeUsername) return
    setLoading(true)
    setMessage(null)
    try {
      const { data: existingUser }: { data: Tables<'users'> | null } = await supabase.from('users').select('id').eq('username', username.toLowerCase()).single()
      if (existingUser && existingUser.id !== user.id) throw new Error('Username is already taken')
      const { error } = await supabase.rpc('update_username', { user_uuid: user.id, new_username: username.toLowerCase() })
      if (error) throw error
      await refreshUser()
      setMessage({ type: 'success', text: 'Username updated successfully!' })
      setCanChangeUsername(false)
      setDaysUntilUsernameChange(14)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update username' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      // Reset theme to default if user is premium and using a premium theme
      if (canUsePremiumThemes && currentThemeId !== 'default') {
        setTheme('default')
      }
      await signOut()
      router.push('/')
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to log out' })
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id)
      if (error) throw error
      await signOut()
      router.push('/')
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete account' })
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <AuthGate requireAuth={true} promptMessage="Sign in to access your account settings and manage your profile" />
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={18} /><span>Profile</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'account' ? styles.active : ''}`} onClick={() => setActiveTab('account')}>
          <Lock size={18} /><span>Account</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'appearance' ? styles.active : ''}`} onClick={() => setActiveTab('appearance')}>
          <Palette size={18} /><span>Appearance</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'premium' ? styles.active : ''}`} onClick={() => setActiveTab('premium')}>
          <Crown size={18} /><span>Premium</span>
        </button>
      </div>
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}><X size={16} /></button>
        </div>
      )}
      {activeTab === 'profile' && (
        <div className={styles.section}>
            <div className={styles.profileHeader}>
              <div className={styles.profileImageContainer}>
                <div className={styles.profileImageWrapper}>
                  {avatarPreview || user.avatar_url ? (
                    <img src={avatarPreview || user.avatar_url || ''} alt="Profile" className={styles.profileImage} />
                  ) : (
                    <img src="/profile.jpg" alt="Profile" className={styles.profileImage} />
                  )}
                  <label className={styles.cameraIcon}>
                    <Camera size={20} />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  </label>
                </div>
                {user.avatar_url && (
                  <button className={styles.removeImageButton} onClick={removeAvatar} disabled={loading}>
                    <X size={14} /> Remove
                  </button>
                )}
              </div>
              <div className={styles.identitySection}>
                <h2 className={styles.identityTitle}>Your Identity</h2>
                <p className={styles.identitySubtitle}>Define how the community sees your stench</p>
              </div>
              <div className={styles.editCoverContainer}>
                <div className={styles.coverActions}>
                  <label className={styles.editCoverButton}>
                    <Upload size={16} />
                    Edit Cover
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleBannerChange}
                      style={{ display: 'none' }}
                      disabled={!canUploadBanner}
                    />
                  </label>
                  {user.banner_url && canUploadBanner && (
                    <button className={styles.removeCoverButton} onClick={removeBanner} disabled={loading}>
                      <X size={14} /> Remove Cover
                    </button>
                  )}
                </div>
                {!canUploadBanner && <span className={styles.premiumLabel}>Premium Feature</span>}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="displayName">Display Name</label>
              <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" maxLength={14} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." maxLength={140} rows={4} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="location">Location</label>
              <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Your location" maxLength={18} />
              <span className={styles.charCount}>{location.length}/18</span>
            </div>
            <button className={styles.saveButton} onClick={handleSaveProfile} disabled={loading}>
              <Save size={18} /><span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
        </div>
      )}
      {(activeTab === 'account' || activeTab === 'appearance' || activeTab === 'premium') && (
        <div className={styles.content}>
          {activeTab === 'account' && (
            <div className={styles.section}>
            <h2>Account Settings</h2>
            <p className={styles.sectionDescription}>Manage your account security and preferences</p>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <div className={styles.readonlyField}>
                <Mail size={18} />
                <input id="email" type="email" value={session?.user?.email || ''} disabled />
              </div>
              <span className={styles.hint}>Email cannot be changed</span>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="Your username" maxLength={30} disabled={!canChangeUsername} />
              {!canChangeUsername && (
                <span className={styles.warning}><AlertCircle size={14} />You can change your username in {daysUntilUsernameChange} days</span>
              )}
              {canChangeUsername && username !== user.username && (
                <button className={styles.secondaryButton} onClick={handleChangeUsername} disabled={loading}>Update Username</button>
              )}
            </div>
            <div className={styles.dangerZone}>
              <h3>Session</h3>
              <button className={styles.logoutButton} onClick={() => setShowLogoutModal(true)} disabled={loading}>
                <LogOut size={18} /><span>Log Out</span>
              </button>
            </div>
            <div className={styles.dangerZone}>
              <h3>Danger Zone</h3>
              <p>Once you delete your account, there is no going back.</p>
              <button className={styles.deleteButton} onClick={() => setShowDeleteModal(true)} disabled={loading}>
                <Trash2 size={18} /><span>Delete Account</span>
              </button>
            </div>
          </div>
        )}
        {activeTab === 'appearance' && (
          <div className={styles.section}>
            <h2>Appearance</h2>
            <p className={styles.sectionDescription}>Customize how Fart Bounty looks for you</p>
            <div className={styles.themesGrid}>
              {availableThemes.map((theme) => (
                <button key={theme.id} className={`${styles.themeCard} ${currentThemeId === theme.id ? styles.active : ''}`} onClick={() => setTheme(theme.id)}>
                  <div className={styles.themePreview}>
                    <div className={styles.themeColor} style={{ background: theme.tokens['--gradient-primary'] }} />
                  </div>
                  <div className={styles.themeInfo}>
                    <span className={styles.themeName}>{theme.displayName}</span>
                    {theme.isPremiumOnly && <span className={styles.premiumBadge}><Crown size={12} /></span>}
                  </div>
                  {currentThemeId === theme.id && <div className={styles.activeIndicator}><Check size={16} /></div>}
                </button>
              ))}
            </div>
            {!canUsePremiumThemes && (
              <div className={styles.upgradePrompt}>
                <Crown size={24} />
                <h3>Unlock Premium Themes</h3>
                <p>Get access to exclusive themes with Fart Bounty Premium</p>
                <button className={styles.upgradeButton} onClick={() => router.push('/shop')}>Upgrade to Premium</button>
              </div>
            )}
          </div>
        )}
        {activeTab === 'premium' && (
          <div className={styles.section}>
            <h2>Premium Status</h2>
            <p className={styles.sectionDescription}>Manage your premium subscription</p>
            <div className={styles.premiumCard}>
              <div className={styles.premiumIcon}><Crown size={32} /></div>
              <div className={styles.premiumContent}>
                {premiumTier !== 'free' ? (
                  <>
                    <h3>{tierConfig.name} Plan</h3>
                    <p>Thank you for supporting Fart Bounty &mdash; <strong>{tierConfig.price}</strong></p>
                    {premiumSince && (
                      <p className={styles.premiumSince}>Member since {new Date(premiumSince).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    )}
                  </>
                ) : (
                  <>
                    <h3>Hey! You&apos;re not verified yet?</h3>
                    <p>Upgrade to Premium to unlock exclusive features</p>
                  </>
                )}

                {/* Plan details — always shown, derived from tierConfig */}
                <div className={styles.premiumFeatures}>
                  <h4>Your Plan Details:</h4>
                  <ul>
                    <li><Check size={16} /> {dailyCreations === 'Unlimited' ? 'Unlimited' : dailyCreations} daily creations</li>
                    <li><Check size={16} /> {tierConfig.maxPostLength} character post limit</li>
                    <li><Check size={16} /> {tierConfig.soundLibrary}</li>
                    <li><Check size={16} /> {tierConfig.editingTools === 'none' ? 'Basic controls (2)' : tierConfig.editingTools === 'basic' ? 'Basic editing (6 controls)' : tierConfig.editingTools === 'advanced' ? 'Advanced editing (9 controls)' : 'Full editing suite (all 12)'}</li>
                    <li><Check size={16} /> {Math.round(tierConfig.maxAvatarSize / (1024 * 1024))}MB avatar uploads</li>
                    {tierConfig.canUseGifAvatar && <li><Check size={16} /> GIF avatars</li>}
                    {tierConfig.canUploadBanner && <li><Check size={16} /> Custom banner</li>}
                    {tierConfig.canUsePremiumThemes && <li><Check size={16} /> Premium themes</li>}
                    {tierConfig.canUsePremiumEffects && <li><Check size={16} /> Premium effects</li>}
                    {tierConfig.canUseExtraEffects && <li><Check size={16} /> Extra effects pack</li>}
                    <li><Check size={16} /> {tierConfig.ads === 'none' ? 'No ads' : tierConfig.ads === 'fewer' ? 'Fewer ads' : 'Ads supported'}</li>
                    {tierConfig.hasMonthlyGifts && <li><Check size={16} /> Monthly digital gifts</li>}
                  </ul>
                </div>

                {/* Daily usage */}
                <div className={styles.premiumFeatures} style={{ marginTop: '12px' }}>
                  <h4>Daily Usage:</h4>
                  <p style={{ fontSize: '14px', color: '#ccc' }}>
                    {dailyCreations === 'Unlimited'
                      ? `${dailyUsage} creations used today (Unlimited)`
                      : `${dailyUsage} / ${dailyCreations} creations used today (${remainingCreations} remaining)`
                    }
                  </p>
                  {!canCreate && (
                    <p style={{ fontSize: '13px', color: '#ff6b6b', marginTop: '4px' }}>
                      Daily limit reached. Upgrade your plan for more creations!
                    </p>
                  )}
                </div>

                {premiumTier === 'free' && (
                  <button className={styles.upgradeButton} onClick={() => setShowPremiumModal(true)}>Choose Your Plan</button>
                )}
              </div>
            </div>
            {/* Button to change/view plans for all users */}
            <button 
              className={styles.managePlanButton} 
              onClick={() => setShowPremiumModal(true)}
            >
              <Crown size={18} />
              <span>{premiumTier !== 'free' ? `Manage Plan (${TIER_CONFIGS[premiumTier].name})` : 'View Premium Plans'}</span>
            </button>
          </div>
          )}
        </div>
      )}
      {showLogoutModal && (
        <div className={styles.modal} onClick={() => setShowLogoutModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <LogOut size={48} className={styles.modalIcon} />
              <h2>Sign Out</h2>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to sign out?</p>
              {canUsePremiumThemes && (currentThemeId !== 'default' && currentThemeId !== 'clean' ) && (
                <p className={styles.modalWarning}>Note: Your current premium theme will reset to the default theme.</p>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowLogoutModal(false)} disabled={loading}>Cancel</button>
              <button className={styles.confirmLogoutButton} onClick={handleLogout} disabled={loading}>{loading ? 'Signing Out...' : 'Yes, Sign Out'}</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className={styles.modal} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <AlertCircle size={48} className={styles.modalIcon} />
              <h2>Delete Account</h2>
            </div>
            <div className={styles.modalBody}>
              <p>Are you absolutely sure you want to delete your account?</p>
              <p className={styles.modalWarning}>This action cannot be undone. All your posts, comments, and data will be permanently deleted.</p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowDeleteModal(false)} disabled={loading}>Cancel</button>
              <button className={styles.confirmDeleteButton} onClick={handleDeleteAccount} disabled={loading}>{loading ? 'Deleting...' : 'Yes, Delete My Account'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Premium Tiers Modal */}
      <PremiumTiersModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
