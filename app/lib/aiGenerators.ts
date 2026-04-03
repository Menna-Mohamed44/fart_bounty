/**
 * AI Generation Utilities
 * Integrates with Groq (text) and FAL.ai (images) for bot content
 */

// Groq API for text generation (bio variations, etc.)
export async function generateTextWithGroq(prompt: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.warn('Groq API key not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // Fast and good quality
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates fun, family-friendly fart-themed content. Keep it lighthearted and appropriate for all ages.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Groq generation error:', error);
    return null;
  }
}

// FAL.ai for image generation (fart-themed art)
export async function generateImageWithFal(prompt: string): Promise<string | null> {
  const apiKey = process.env.FAL_API_KEY;
  
  if (!apiKey) {
    console.warn('FAL API key not configured');
    return null;
  }

  try {
    // Enhanced prompt for family-friendly fart art
    const enhancedPrompt = `Cute, cartoonish, family-friendly: ${prompt}. Colorful, funny, whimsical art style. No realistic humans, keep it abstract and fun.`;

    const response = await fetch('https://fal.run/fal-ai/fast-sdxl', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        image_size: 'square_hd',
        num_inference_steps: 25,
        num_images: 1
      })
    });

    if (!response.ok) {
      throw new Error(`FAL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.images?.[0]?.url || null;
  } catch (error) {
    console.error('FAL image generation error:', error);
    return null;
  }
}

// Alternative: Replicate for image generation
export async function generateImageWithReplicate(prompt: string): Promise<string | null> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  
  if (!apiKey) {
    console.warn('Replicate API key not configured');
    return null;
  }

  try {
    const enhancedPrompt = `Cute cartoon style, family-friendly: ${prompt}. Whimsical, colorful, funny illustration.`;

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'stability-ai/sdxl:latest',
        input: {
          prompt: enhancedPrompt,
          negative_prompt: 'realistic, photographic, nsfw, inappropriate, scary, dark',
          width: 1024,
          height: 1024
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction = await response.json();
    
    // Poll for result (Replicate is async)
    let result = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${apiKey}`,
          }
        }
      );
      
      const status = await statusResponse.json();
      
      if (status.status === 'succeeded') {
        result = status.output?.[0];
        break;
      } else if (status.status === 'failed') {
        throw new Error('Image generation failed');
      }
    }
    
    return result;
  } catch (error) {
    console.error('Replicate image generation error:', error);
    return null;
  }
}

// Get random video from audio library for sharing
export async function getRandomLibraryVideo(): Promise<{ id: string; url: string; name: string } | null> {
  try {
    const { createClient } = await import('@/app/lib/supabaseClient');
    const supabase = createClient();

    const { data: videos, error } = await supabase
      .from('audio_library')
      .select('id, audio_url, name')
      .limit(50);

    if (error || !videos || videos.length === 0) {
      console.error('Error fetching library videos:', error);
      return null;
    }

    const randomVideo = videos[Math.floor(Math.random() * videos.length)];
    
    return {
      id: randomVideo.id,
      url: randomVideo.audio_url,
      name: randomVideo.name
    };
  } catch (error) {
    console.error('Error getting random video:', error);
    return null;
  }
}

// Generate bot bio variation using Groq
export async function generateBotBio(
  characterDescription: string,
  traits: string[]
): Promise<string | null> {
  const prompt = `Generate a short, fun bio (max 150 characters) for this character:
  
Description: ${characterDescription}
Personality traits: ${traits.join(', ')}

The bio should be family-friendly, include an emoji or two, and capture their personality. Make it snappy and fun!`;

  return await generateTextWithGroq(prompt);
}

// Generate fart-themed image based on type
export async function generateFartImage(imagePrompt: string): Promise<string | null> {
  // Try FAL first (faster), fall back to Replicate
  let imageUrl = await generateImageWithFal(imagePrompt);
  
  if (!imageUrl) {
    imageUrl = await generateImageWithReplicate(imagePrompt);
  }
  
  return imageUrl;
}

// Upload generated image to Supabase storage
export async function uploadGeneratedImage(
  imageUrl: string,
  botUsername: string,
  postType: string
): Promise<string | null> {
  try {
    // Download the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Upload to Supabase
    const { createClient } = await import('@/app/lib/supabaseClient');
    const supabase = createClient();
    
    const fileName = `${botUsername}/${postType}-${Date.now()}.png`;
    
    const { data, error } = await supabase.storage
      .from('bot-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('bot-images')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadGeneratedImage:', error);
    return null;
  }
}
